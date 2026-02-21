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
});

function handleOpenAIRequest(payload, senderTab) {
  return chrome.storage.sync.get(['openaiApiKey']).then(function (result) {
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
          return runOpenAI(apiKey, payload);
        })
        .catch(function (err) {
          return { error: 'Could not capture the page. Try again.' };
        });
    }
    return runOpenAI(apiKey, payload);
  });
}

function runOpenAI(apiKey, payload) {
  var built = buildOpenAIPayload(payload);
  return callOpenAI(apiKey, built.model, built.messages).then(
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

function buildOpenAIPayload(payload) {
  var query = payload.query || '';
  var elements = payload.elements || [];
  var imagePayloads = payload.imagePayloads || [];

  var systemText = 'You are helping a blind or low-vision user understand a web page. You will receive a list of elements with positions (top, left, width, height in pixels, relative to viewport) and the user\'s question. When given a screenshot of the page, describe what you see clearly and concisely. Give concise, straight-to-the-point answers that are still useful. No long intros or filler—your answer will be read aloud.';
  var elementsText = JSON.stringify(elements, null, 0);
  if (elementsText.length > 12000) {
    elementsText = elementsText.slice(0, 12000) + '...[truncated]';
  }

  var useVision = queryWantsVision(query) && imagePayloads && imagePayloads.length > 0;
  var model = useVision ? 'gpt-4o' : 'gpt-4o-mini';
  var userContent = [];

  userContent.push({ type: 'text', text: 'Page elements (position in viewport pixels):\n' + elementsText + '\n\nUser question: ' + query });

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

  return { model: model, messages: messages };
}

function callOpenAI(apiKey, model, messages) {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: model, messages: messages }),
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
