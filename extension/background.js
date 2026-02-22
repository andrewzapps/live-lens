chrome.commands.onCommand.addListener(function (command) {
  if (command !== 'start-live-lens') return;
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs[0];
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'START_LIVE_LENS' }, function () {
      if (chrome.runtime.lastError && chrome.runtime.lastError.message.indexOf('Receiving end does not exist') !== -1) {
        chrome.scripting.executeScript(
          { target: { tabId: tab.id }, files: ['content.js'] },
          function () {
            if (chrome.runtime.lastError) return;
            chrome.tabs.sendMessage(tab.id, { type: 'START_LIVE_LENS' });
          }
        );
      }
    });
  });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === 'OPENAI_REQUEST') {
    handleOpenAIRequest(message.payload, sender.tab)
      .then(function (result) {
        sendResponse(result);
      })
      .catch(function (err) {
        sendResponse({ error: err.message || 'Request failed.' });
      });
    return true;
  }
  if (message.type === 'DEEPGRAM_TTS') {
    handleDeepgramTTS(message.text)
      .then(function (result) {
        sendResponse(result);
      })
      .catch(function (err) {
        sendResponse({ error: err.message || 'TTS failed.' });
      });
    return true;
  }
});

function handleDeepgramTTS(text) {
  if (!text || !text.trim()) return Promise.resolve({ error: 'No text to speak.' });
  var truncated = text.length > 3000 ? text.slice(0, 3000) + '\u2026' : text;
  return chrome.storage.sync.get(['deepgramApiKey', 'deepgramVoice', 'speechOutputLanguage']).then(function (result) {
    var apiKey = result.deepgramApiKey;
    if (!apiKey) {
      return { error: 'Set Deepgram API key in the extension popup for voice.' };
    }
    var outLang = result.speechOutputLanguage || 'en';
    var model;
    if (outLang === 'en') {
      model = result.deepgramVoice || 'aura-2-aries-en';
    } else {
      var langModels = { es: 'aura-2-celeste-es', fr: 'aura-2-agathe-fr', de: 'aura-2-julius-de', ja: 'aura-2-fujin-ja' };
      model = langModels[outLang] || 'aura-2-aries-en';
    }
    var url = 'https://api.deepgram.com/v1/speak?model=' + encodeURIComponent(model) + '&encoding=mp3';
    return fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Token ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: truncated }),
    }).then(function (res) {
      if (!res.ok) {
        if (res.status === 401) throw new Error('Invalid Deepgram API key.');
        throw new Error('Deepgram TTS failed.');
      }
      return res.arrayBuffer();
    }).then(function (buffer) {
      var bytes = new Uint8Array(buffer);
      var binary = '';
      for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      var base64 = btoa(binary);
      return { audioBase64: base64, mimeType: 'audio/mpeg' };
    });
  });
}

function handleOpenAIRequest(payload, senderTab) {
  return chrome.storage.sync.get(['openaiApiKey', 'speechOutputLanguage']).then(function (result) {
    var apiKey = result.openaiApiKey;
    if (!apiKey) {
      return { error: 'Please set your API key in the extension popup.' };
    }
    if (payload.needScreenshot && senderTab && senderTab.windowId) {
      return chrome.tabs.captureVisibleTab(senderTab.windowId, { format: 'jpeg', quality: 92 })
        .then(function (dataUrl) {
          payload.imagePayloads = [{ dataUri: dataUrl }];
          payload.needScreenshot = false;
          if (senderTab.id) {
            chrome.tabs.sendMessage(senderTab.id, { type: 'CAPTURE_DONE' }).catch(function () {});
          }
          return runOpenAI(apiKey, payload, result);
        })
        .catch(function (err) {
          return { error: 'Could not capture the page. Try again.' };
        });
    }
    return runOpenAI(apiKey, payload, result);
  });
}

function runOpenAI(apiKey, payload, storageResult) {
  var outputLang = (storageResult && storageResult.speechOutputLanguage) || 'en';
  var built = buildOpenAIPayload(payload, outputLang);
  return callOpenAI(apiKey, built.model, built.messages, built.max_tokens).then(
    function (text) {
      return { text: text };
    },
    function (err) {
      return { error: err.message || 'Could not reach the assistant. Check your API key and connection.' };
    }
  );
}

function queryWantsVision(query) {
  var q = (query || '').toLowerCase();
  var imageWords = ['image', 'picture', 'photo', 'screenshot', 'screen', 'that image', 'this image', 'the image', 'what is that', 'describe', 'what\'s on', 'whats on', 'show me', 'see on'];
  for (var i = 0; i < imageWords.length; i++) {
    if (q.indexOf(imageWords[i]) !== -1) return true;
  }
  return false;
}

function buildCompactElements(elements) {
  var contentTags = { p: 1, article: 1, section: 1, main: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1 };
  var lines = [];
  for (var i = 0; i < elements.length; i++) {
    var e = elements[i];
    var r = e.rect || {};
    var isContent = e.isContent || contentTags[e.tag];
    var maxLen = isContent ? 200 : 85;
    var label = (e.label || '').replace(/"/g, "'").slice(0, maxLen);
    if (label.length < (e.label || '').length) label += '…';
    lines.push(e.tag + (e.role ? '[' + e.role + ']' : '') + ' "' + label + '" @' + (r.top || 0) + ',' + (r.left || 0) + ' ' + (r.width || 0) + 'x' + (r.height || 0));
  }
  return lines.join('\n');
}

function buildOpenAIPayload(payload, outputLang) {
  var query = payload.query || '';
  var elements = payload.elements || [];
  var viewport = payload.viewport || null;
  var imagePayloads = payload.imagePayloads || [];

  var langNames = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', ja: 'Japanese' };
  var langInstruction = outputLang && outputLang !== 'en' && langNames[outputLang]
    ? ' Respond entirely in ' + langNames[outputLang] + '.'
    : '';

  var systemText = 'You help a blind or low-vision user understand a web page. You get elements with their text content and positions (top, left, width x height in viewport pixels). Use the actual text in the "label" field to answer: summarize the page, answer "what is this about", list key points, or say what a specific element says. For position questions ("top right", "that button") use the coordinates. When given a screenshot, describe it briefly. Be direct and concise—answer will be read aloud.' + langInstruction;

  var elementsText = buildCompactElements(elements);
  if (elementsText.length > 9000) elementsText = elementsText.slice(0, 9000) + '\n...[truncated]';

  var viewportLine = viewport && viewport.h && viewport.w
    ? 'Viewport: ' + viewport.h + 'px tall, ' + viewport.w + 'px wide.\n\n'
    : '';

  var useVision = queryWantsVision(query) && imagePayloads && imagePayloads.length > 0;
  var model = useVision ? 'gpt-4o' : 'gpt-4o-mini';
  var userContent = [];

  userContent.push({ type: 'text', text: viewportLine + 'Elements (tag [role] "label" @top,left widthxheight):\n' + elementsText + '\n\nUser question: ' + query });

  if (useVision && imagePayloads.length > 0) {
    for (var i = 0; i < imagePayloads.length; i++) {
      var img = imagePayloads[i];
      if (img.dataUri) {
        userContent.push({
          type: 'image_url',
          image_url: { url: img.dataUri }
        });
      }
    }
  }

  var messages = [
    { role: 'system', content: systemText },
    { role: 'user', content: userContent }
  ];

  var opts = { model: model, messages: messages };
  if (!useVision) opts.max_tokens = 300;
  return opts;
}

function callOpenAI(apiKey, model, messages, maxTokens) {
  var body = { model: model, messages: messages };
  if (maxTokens) body.max_tokens = maxTokens;
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).then(function (res) {
    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid API key.');
      if (res.status === 429) throw new Error('Rate limit exceeded. Try again shortly.');
      throw new Error('Could not reach the assistant. Check your connection.');
    }
    return res.json();
  }).then(function (data) {
    var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (content == null) throw new Error('Unexpected response from API.');
    return content;
  });
}
