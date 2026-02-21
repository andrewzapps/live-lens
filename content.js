(function () {
  var overlay = null;
  var recognition = null;
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
    if (overlay) {
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.display = 'none';
    }
  }

  function stopRecognition() {
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
      recognition = null;
    }
  }

  function startRecognition() {
    if (!SpeechRecognition) {
      setState('error', 'Speech recognition is not supported in this browser.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = document.documentElement.lang || 'en-US';

    recognition.onresult = function (event) {
      var transcript = '';
      if (event.results && event.results.length > 0 && event.results[0].length > 0) {
        transcript = event.results[0][0].transcript || '';
      }
      recognition = null;
      if (!transcript.trim()) {
        setState('listening', 'No speech detected. Try again or cancel.');
        return;
      }
      setState('processing', 'Processing…');
      var elements = extractElements();
      var imagePayloads = [];
      if (wantsVision(transcript, elements)) {
        imagePayloads = getImagePayloads(elements);
      }
      chrome.runtime.sendMessage(
        { type: 'OPENAI_REQUEST', payload: { query: transcript, elements: elements, imagePayloads: imagePayloads } },
        function (response) {
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
              setState('done', 'Done');
            });
          }
        }
      );
    };

    recognition.onerror = function (event) {
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
    }
  });
})();
