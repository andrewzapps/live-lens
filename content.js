(function () {
  var overlay = null;
  var recognition = null;
  var silenceTimer = null;
  var SILENCE_MS = 1000;
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function getOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'live-lens-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Live Lens');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-hidden', 'true');

    var box = document.createElement('div');
    box.className = 'live-lens-box';

    var status = document.createElement('div');
    status.className = 'live-lens-status';
    status.setAttribute('data-state', 'idle');
    status.textContent = 'Listening…';

    var actions = document.createElement('div');
    actions.className = 'live-lens-actions';
    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'live-lens-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', hideOverlay);
    actions.appendChild(cancelBtn);
    var stopBtn = document.createElement('button');
    stopBtn.type = 'button';
    stopBtn.className = 'live-lens-btn live-lens-stop';
    stopBtn.textContent = 'Stop';
    stopBtn.style.display = 'none';
    stopBtn.addEventListener('click', stopSpeaking);
    actions.appendChild(stopBtn);

    box.appendChild(status);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideOverlay();
      }
    });

    return overlay;
  }

  function getStatusEl() {
    return getOverlay().querySelector('.live-lens-status');
  }

  function setState(state, text) {
    var el = getStatusEl();
    if (!el) return;
    el.setAttribute('data-state', state);
    el.textContent = text || (state === 'listening' ? 'Listening…' : state === 'processing' ? 'Processing…' : state === 'speaking' ? 'Speaking…' : state === 'error' ? 'Error' : state === 'done' ? 'Done' : '');
    var o = overlay;
    if (o) {
      var stopBtn = o.querySelector('.live-lens-stop');
      if (stopBtn) stopBtn.style.display = state === 'speaking' ? '' : 'none';
    }
  }

  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    hideOverlay();
  }

  function showOverlay() {
    var o = getOverlay();
    o.setAttribute('aria-hidden', 'false');
    o.style.display = 'flex';
    setState('listening', 'Listening…');
    var cancelBtn = o.querySelector('.live-lens-btn');
    if (cancelBtn) cancelBtn.focus();
    startRecognition();
  }

  function hideOverlay() {
    stopRecognition();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (overlay) {
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.display = 'none';
    }
  }

  function stopRecognition() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
      recognition = null;
    }
  }

  function processTranscript(transcript) {
    if (!transcript || !transcript.trim()) {
      setState('listening', 'No speech detected. Try again or cancel.');
      return;
    }
    recognition = null;
    setState('processing', 'Processing…');
    var elements = extractElements();
    var needScreenshot = wantsVision(transcript, elements);

    function sendRequest() {
      chrome.runtime.sendMessage(
        { type: 'OPENAI_REQUEST', payload: { query: transcript.trim(), elements: elements, needScreenshot: needScreenshot } },
        function (response) {
          if (overlay) overlay.style.visibility = '';
          if (chrome.runtime.lastError) {
            setState('error', 'Extension error.');
            return;
          }
          if (response && response.error) {
            setState('error', response.error);
            speak(response.error);
            return;
          }
          if (response && response.text) {
            setState('speaking', 'Speaking…');
            speak(response.text, function () {
              hideOverlay();
            });
          }
        }
      );
    }

    if (needScreenshot && overlay) {
      overlay.style.visibility = 'hidden';
      setTimeout(sendRequest, 200);
    } else {
      sendRequest();
    }
  }

  function startRecognition() {
    if (!SpeechRecognition) {
      setState('error', 'Speech recognition is not supported in this browser.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = document.documentElement.lang || 'en-US';

    var lastTranscript = '';

    recognition.onresult = function (event) {
      var transcript = '';
      var results = event.results;
      for (var i = 0; i < results.length; i++) {
        for (var j = 0; j < results[i].length; j++) {
          transcript = results[i][j].transcript || '';
        }
      }
      if (!transcript) return;
      lastTranscript = transcript;
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(function () {
        silenceTimer = null;
        stopRecognition();
        processTranscript(lastTranscript);
      }, SILENCE_MS);
    };

    recognition.onerror = function (event) {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
      if (event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setState('error', 'Microphone access was denied.');
      } else if (event.error === 'no-speech') {
        setState('listening', 'No speech detected. Try again or cancel.');
      } else {
        setState('error', 'Recognition error: ' + (event.error || 'unknown'));
      }
    };

    recognition.onend = function () {
      if (getStatusEl() && getStatusEl().getAttribute('data-state') === 'listening' && !recognition) return;
    };

    try {
      recognition.start();
    } catch (e) {
      setState('error', 'Could not start microphone.');
    }
  }

  function extractElements() {
    var selector = 'a, button, [role="button"], input, select, textarea, h1, h2, h3, h4, h5, h6, img, [role="heading"], [role="link"], [role="img"], nav, main, header, footer, article, section, [role="main"], [role="navigation"]';
    var nodes = document.querySelectorAll(selector);
    var list = [];
    var viewportTop = 0;
    var viewportLeft = 0;
    var viewportHeight = window.innerHeight;
    var viewportWidth = window.innerWidth;
    var maxCount = 200;
    for (var i = 0; i < nodes.length && list.length < maxCount; i++) {
      var el = nodes[i];
      if (!el.getBoundingClientRect || !isVisible(el)) continue;
      var rect = el.getBoundingClientRect();
      if (rect.width < 2 && rect.height < 2) continue;
      var label = getLabel(el);
      var tag = el.tagName ? el.tagName.toLowerCase() : '';
      var role = (el.getAttribute && el.getAttribute('role')) || '';
      list.push({
        tag: tag,
        role: role,
        label: label ? label.slice(0, 200) : '',
        rect: { top: Math.round(rect.top), left: Math.round(rect.left), width: Math.round(rect.width), height: Math.round(rect.height) },
        idOrIndex: el.id || list.length
      });
    }
    return list;
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || style.opacity === '0') return false;
    if (el.offsetParent === null && style.position !== 'fixed') return false;
    return true;
  }

  function getLabel(el) {
    var label = (el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('title') || (el.tagName && el.tagName.toLowerCase() === 'img' ? el.getAttribute('alt') : null))) || '';
    if (label) return label.trim();
    if (el.textContent) return el.textContent.trim().slice(0, 300);
    return '';
  }

  function wantsVision(query, elements) {
    var q = query.toLowerCase();
    var imageWords = ['image', 'picture', 'photo', 'that image', 'this image', 'the image', 'what is that', 'describe'];
    for (var i = 0; i < imageWords.length; i++) {
      if (q.indexOf(imageWords[i]) !== -1) {
        for (var j = 0; j < elements.length; j++) {
          if (elements[j].tag === 'img') return true;
        }
        break;
      }
    }
    return false;
  }

  function getImagePayloads(elements) {
    var payloads = [];
    var maxImages = 4;
    var imgs = document.querySelectorAll('img[src]');
    for (var k = 0; k < imgs.length && payloads.length < maxImages; k++) {
      if (!isVisible(imgs[k])) continue;
      var dataUri = imageToDataUri(imgs[k]);
      if (dataUri) payloads.push({ dataUri: dataUri });
    }
    return payloads;
  }

  function imageToDataUri(img) {
    if (!img || !img.src) return null;
    if (img.src.startsWith('data:')) return img.src;
    try {
      var c = document.createElement('canvas');
      var w = Math.min(img.naturalWidth || img.width || 512, 1024);
      var h = Math.min(img.naturalHeight || img.height || 512, 1024);
      c.width = w;
      c.height = h;
      var ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      return null;
    }
  }

  function speak(text, onEnd) {
    if (!text || !window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    var truncated = text.length > 3000 ? text.slice(0, 3000) + '…' : text;
    var u = new SpeechSynthesisUtterance(truncated);
    u.rate = 1;
    u.onend = function () { if (onEnd) onEnd(); };
    u.onerror = function () { if (onEnd) onEnd(); };
    window.speechSynthesis.speak(u);
  }

  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === 'START_LIVE_LENS') {
      showOverlay();
    } else if (message.type === 'CAPTURE_DONE') {
      if (overlay) overlay.style.visibility = '';
      setState('processing', 'Processing…');
    }
  });
})();
