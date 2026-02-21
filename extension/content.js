(function () {
  var overlay = null;
  var pill = null;
  var recognition = null;
  var silenceTimer = null;
  var SILENCE_MS = 1000;
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var audioStream = null;
  var audioContext = null;
  var analyser = null;
  var volumeFrameId = null;
  var barEls = [];
  var currentAudio = null;
  var responseOverlay = null;

  function getResponseOverlay() {
    if (responseOverlay) return responseOverlay;
    responseOverlay = document.createElement('div');
    responseOverlay.id = 'live-lens-response-overlay';
    responseOverlay.setAttribute('role', 'dialog');
    responseOverlay.setAttribute('aria-modal', 'true');
    responseOverlay.setAttribute('aria-label', 'Live Lens response');
    responseOverlay.className = 'live-lens-response-overlay';
    responseOverlay.style.display = 'none';

    var box = document.createElement('div');
    box.className = 'live-lens-response-box';
    var textEl = document.createElement('div');
    textEl.className = 'live-lens-response-text';
    textEl.setAttribute('aria-live', 'polite');
    box.appendChild(textEl);
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'live-lens-response-close';
    closeBtn.textContent = 'Close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', hideResponseOverlay);
    box.appendChild(closeBtn);
    responseOverlay.appendChild(box);

    responseOverlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideResponseOverlay();
      }
    });
    document.body.appendChild(responseOverlay);
    return responseOverlay;
  }

  function showResponseOverlay(text) {
    var el = getResponseOverlay();
    var textEl = el.querySelector('.live-lens-response-text');
    textEl.textContent = text || '';
    el.style.display = 'flex';
    var closeBtn = el.querySelector('.live-lens-response-close');
    if (closeBtn) closeBtn.focus();
  }

  function hideResponseOverlay() {
    if (responseOverlay) responseOverlay.style.display = 'none';
  }

  function getOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'live-lens-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Live Lens');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-hidden', 'true');

    var wrap = document.createElement('div');
    wrap.className = 'live-lens-pill-wrap';

    pill = document.createElement('div');
    pill.className = 'live-lens-pill live-lens-pill--listening';

    var bars = document.createElement('div');
    bars.className = 'live-lens-bars';
    barEls = [];
    for (var i = 0; i < 5; i++) {
      var bar = document.createElement('div');
      bar.className = 'live-lens-bar';
      bar.setAttribute('aria-hidden', 'true');
      bars.appendChild(bar);
      barEls.push(bar);
    }
    pill.appendChild(bars);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'live-lens-pill-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      hideOverlay();
    });
    pill.appendChild(closeBtn);

    wrap.appendChild(pill);
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);

    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideOverlay();
      }
    });

    return overlay;
  }

  function setState(state, text) {
    if (!pill) return;
    pill.classList.remove('live-lens-pill--listening', 'live-lens-pill--loading', 'live-lens-pill--speaking', 'live-lens-pill--error');
    pill.classList.add('live-lens-pill--' + state);
    var errorEl = pill.querySelector('.live-lens-error');
    if (errorEl) errorEl.remove();
    if (state === 'error' && text) {
      var err = document.createElement('div');
      err.className = 'live-lens-error';
      err.textContent = text.length > 60 ? text.slice(0, 57) + '…' : text;
      pill.insertBefore(err, pill.firstChild);
    }
    if (state === 'listening') startVolumeBars();
    else stopVolumeBars();
    if (state === 'processing' || state === 'speaking') {
      for (var i = 0; i < barEls.length; i++) {
        if (barEls[i]) barEls[i].style.removeProperty('height');
      }
    }
  }

  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    hideOverlay();
  }

  function startVolumeBars() {
    stopVolumeBars();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      audioStream = stream;
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        var source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        var dataArray = new Uint8Array(analyser.frequencyBinCount);
        function tick() {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          var sum = 0;
          for (var i = 0; i < dataArray.length; i++) sum += dataArray[i];
          var avg = sum / dataArray.length;
          var height = 4 + (avg / 255) * 20;
          for (var j = 0; j < barEls.length; j++) {
            var h = 4 + (height * (0.6 + 0.4 * Math.sin(Date.now() / 100 + j)))|0;
            if (barEls[j]) barEls[j].style.height = Math.min(24, h) + 'px';
          }
          volumeFrameId = requestAnimationFrame(tick);
        }
        tick();
      } catch (e) {}
    }).catch(function () {});
  }

  function stopVolumeBars() {
    if (volumeFrameId) {
      cancelAnimationFrame(volumeFrameId);
      volumeFrameId = null;
    }
    if (audioStream) {
      audioStream.getTracks().forEach(function (t) { t.stop(); });
      audioStream = null;
    }
    if (audioContext) {
      audioContext.close().catch(function () {});
      audioContext = null;
    }
    analyser = null;
    for (var i = 0; i < barEls.length; i++) {
      if (barEls[i]) barEls[i].style.height = '4px';
    }
  }

  function showOverlay() {
    var o = getOverlay();
    o.setAttribute('aria-hidden', 'false');
    o.style.display = 'flex';
    setState('listening');
    startRecognition();
  }

  function hideOverlay() {
    stopRecognition();
    stopVolumeBars();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
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
        setState('error', 'No speech detected. Try again or cancel.');
        return;
      }
    recognition = null;
    setState('processing');
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
            chrome.storage.sync.get(['responseMode'], function (res) {
              var mode = (res && res.responseMode) || 'speak';
              if (mode === 'overlay') {
                hideOverlay();
                showResponseOverlay(response.error);
              } else {
                setState('error', response.error);
                speak(response.error);
              }
            });
            return;
          }
          if (response && response.text) {
            chrome.storage.sync.get(['responseMode'], function (res) {
              var mode = (res && res.responseMode) || 'speak';
              if (mode === 'overlay') {
                hideOverlay();
                showResponseOverlay(response.text);
              } else {
                speak(response.text, function () {
                  hideOverlay();
                }, function () {
                  setState('speaking');
                });
              }
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
        setState('error', 'No speech detected. Try again or cancel.');
      } else {
        setState('error', 'Recognition error: ' + (event.error || 'unknown'));
      }
    };

    recognition.onend = function () {
      if (pill && pill.classList.contains('live-lens-pill--listening') && !recognition) return;
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

  function speak(text, onEnd, onStart) {
    if (!text) {
      if (onEnd) onEnd();
      return;
    }
    chrome.runtime.sendMessage({ type: 'DEEPGRAM_TTS', text: text }, function (response) {
      if (chrome.runtime.lastError || (response && response.error)) {
        fallbackSpeak(text, onEnd, onStart);
        return;
      }
      if (response && response.audioBase64 && response.mimeType) {
        var binary = atob(response.audioBase64);
        var bytes = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        var blob = new Blob([bytes], { type: response.mimeType });
        var url = URL.createObjectURL(blob);
        var audio = new Audio(url);
        currentAudio = audio;
        audio.onended = function () {
          if (currentAudio === audio) currentAudio = null;
          URL.revokeObjectURL(url);
          if (onEnd) onEnd();
        };
        audio.onerror = function () {
          if (currentAudio === audio) currentAudio = null;
          URL.revokeObjectURL(url);
          if (onEnd) onEnd();
        };
        audio.play().then(function () {
          if (onStart) onStart();
        }).catch(function () {
          if (currentAudio === audio) currentAudio = null;
          URL.revokeObjectURL(url);
          fallbackSpeak(text, onEnd, onStart);
        });
      } else {
        fallbackSpeak(text, onEnd, onStart);
      }
    });
  }

  function fallbackSpeak(text, onEnd, onStart) {
    if (!window.speechSynthesis) {
      if (onEnd) onEnd();
      return;
    }
    var truncated = text.length > 3000 ? text.slice(0, 3000) + '\u2026' : text;
    var u = new SpeechSynthesisUtterance(truncated);
    u.rate = 1;
    u.onstart = function () { if (onStart) onStart(); };
    u.onend = function () { if (onEnd) onEnd(); };
    u.onerror = function () { if (onEnd) onEnd(); };
    window.speechSynthesis.speak(u);
  }

  chrome.runtime.onMessage.addListener(function (message) {
    if (message.type === 'START_LIVE_LENS') {
      showOverlay();
    } else if (message.type === 'CAPTURE_DONE') {
      if (overlay) overlay.style.visibility = '';
      setState('processing');
    }
  });
})();
