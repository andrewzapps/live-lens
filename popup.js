(function () {
  const input = document.getElementById('api-key');
  const deepgramInput = document.getElementById('deepgram-key');
  const saveBtn = document.getElementById('save');
  const status = document.getElementById('status');

  chrome.storage.sync.get(['openaiApiKey', 'deepgramApiKey'], function (result) {
    if (result.openaiApiKey) input.value = result.openaiApiKey;
    if (result.deepgramApiKey) deepgramInput.value = result.deepgramApiKey;
  });

  saveBtn.addEventListener('click', function () {
    const key = input.value.trim();
    if (!key) {
      status.textContent = 'Enter an OpenAI API key.';
      status.classList.add('error');
      return;
    }
    const deepgramKey = deepgramInput.value.trim();
    chrome.storage.sync.set({ openaiApiKey: key, deepgramApiKey: deepgramKey }, function () {
      status.textContent = 'Saved.';
      status.classList.remove('error');
    });
  });
})();
