(function () {
  const input = document.getElementById('api-key');
  const saveBtn = document.getElementById('save');
  const status = document.getElementById('status');

  chrome.storage.sync.get(['openaiApiKey'], function (result) {
    if (result.openaiApiKey) {
      input.value = result.openaiApiKey;
    }
  });

  saveBtn.addEventListener('click', function () {
    const key = input.value.trim();
    if (!key) {
      status.textContent = 'Enter an API key.';
      status.classList.add('error');
      return;
    }
    chrome.storage.sync.set({ openaiApiKey: key }, function () {
      status.textContent = 'Saved.';
      status.classList.remove('error');
    });
  });
})();
