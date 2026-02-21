import { useEffect, useState } from "react";

const STORAGE_KEY = "live-lens-openai-key";

export default function Popup() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result[STORAGE_KEY]) setApiKey(result[STORAGE_KEY]);
    });
  }, []);

  const saveKey = () => {
    chrome.storage.local.set({ [STORAGE_KEY]: apiKey.trim() }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const openCurrentTabAndStart = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "LIVE_LENS_ACTIVATE" }).catch(() => {
          // Content script not loaded (e.g. restricted page or just installed) — reload helps
        });
        window.close();
      }
    });
  };

  return (
    <div>
      <h1 style={{ margin: "0 0 16px", fontSize: "18px" }}>Live Lens</h1>
      <div className="form-group">
        <label htmlFor="api-key">OpenAI API key</label>
        <input
          id="api-key"
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>
      <button type="button" className="btn btn-secondary" onClick={saveKey}>
        {saved ? "Saved" : "Save key"}
      </button>
      <button type="button" className="btn btn-primary" onClick={openCurrentTabAndStart} style={{ marginTop: "12px" }}>
        Describe this page
      </button>
      <p className="help">
        Or use <kbd>Alt+Shift+D</kbd> on any page to describe the page or a selected element.
      </p>
    </div>
  );
}
