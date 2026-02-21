(function () {
  var OUTPUT_LANGUAGES = [
    { id: 'en', label: 'English' },
    { id: 'es', label: 'Spanish' },
    { id: 'fr', label: 'French' },
    { id: 'de', label: 'German' },
    { id: 'ja', label: 'Japanese' }
  ];

  var VOICES = [
    { id: 'aura-2-thalia-en', label: 'Thalia - Clear, Confident, Energetic' },
    { id: 'aura-2-andromeda-en', label: 'Andromeda - Casual, Expressive' },
    { id: 'aura-2-helena-en', label: 'Helena - Caring, Natural, Friendly' },
    { id: 'aura-2-apollo-en', label: 'Apollo - Confident, Comfortable, Casual' },
    { id: 'aura-2-arcas-en', label: 'Arcas - Natural, Smooth, Clear' },
    { id: 'aura-2-aries-en', label: 'Aries - Warm, Energetic, Caring' },
    { id: 'aura-2-asteria-en', label: 'Asteria - Clear, Confident, Knowledgeable' },
    { id: 'aura-2-athena-en', label: 'Athena - Calm, Smooth, Professional' },
    { id: 'aura-2-atlas-en', label: 'Atlas - Enthusiastic, Confident, Friendly' },
    { id: 'aura-2-cora-en', label: 'Cora - Smooth, Melodic, Caring' },
    { id: 'aura-2-draco-en', label: 'Draco - Warm, Trustworthy, Baritone (British)' },
    { id: 'aura-2-harmonia-en', label: 'Harmonia - Empathetic, Clear, Calm' },
    { id: 'aura-2-hera-en', label: 'Hera - Smooth, Warm, Professional' },
    { id: 'aura-2-hermes-en', label: 'Hermes - Expressive, Engaging' },
    { id: 'aura-2-mars-en', label: 'Mars - Smooth, Patient, Baritone' },
    { id: 'aura-2-neptune-en', label: 'Neptune - Professional, Patient, Polite' },
    { id: 'aura-2-orion-en', label: 'Orion - Approachable, Calm, Polite' },
    { id: 'aura-2-orpheus-en', label: 'Orpheus - Professional, Clear, Trustworthy' },
    { id: 'aura-2-pluto-en', label: 'Pluto - Smooth, Calm, Empathetic' },
    { id: 'aura-2-zeus-en', label: 'Zeus - Deep, Trustworthy, Smooth' }
  ];

  var input = document.getElementById('api-key');
  var deepgramInput = document.getElementById('deepgram-key');
  var voiceSelect = document.getElementById('voice');
  var languageSelect = document.getElementById('language');
  var saveBtn = document.getElementById('save');
  var status = document.getElementById('status');

  var opt;
  for (var i = 0; i < VOICES.length; i++) {
    opt = document.createElement('option');
    opt.value = VOICES[i].id;
    opt.textContent = VOICES[i].label;
    voiceSelect.appendChild(opt);
  }
  for (var j = 0; j < OUTPUT_LANGUAGES.length; j++) {
    opt = document.createElement('option');
    opt.value = OUTPUT_LANGUAGES[j].id;
    opt.textContent = OUTPUT_LANGUAGES[j].label;
    languageSelect.appendChild(opt);
  }

  chrome.storage.sync.get(['openaiApiKey', 'deepgramApiKey', 'deepgramVoice', 'speechOutputLanguage'], function (result) {
    if (result.openaiApiKey) input.value = result.openaiApiKey;
    if (result.deepgramApiKey) deepgramInput.value = result.deepgramApiKey;
    if (result.deepgramVoice) voiceSelect.value = result.deepgramVoice;
    else voiceSelect.value = 'aura-2-aries-en';
    if (result.speechOutputLanguage) languageSelect.value = result.speechOutputLanguage;
    else languageSelect.value = 'en';
  });

  saveBtn.addEventListener('click', function () {
    var key = input.value.trim();
    if (!key) {
      status.textContent = 'Enter an OpenAI API key.';
      status.classList.add('error');
      return;
    }
    var deepgramKey = deepgramInput.value.trim();
    var voice = voiceSelect.value || 'aura-2-aries-en';
    var language = languageSelect.value || 'en';
    chrome.storage.sync.set({
      openaiApiKey: key,
      deepgramApiKey: deepgramKey,
      deepgramVoice: voice,
      speechOutputLanguage: language
    }, function () {
      status.textContent = 'Saved.';
      status.classList.remove('error');
    });
  });
})();
