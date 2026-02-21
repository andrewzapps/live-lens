import "./content.css";
import { createRoot } from "react-dom/client";
import ContentUI from "./ContentUI";

const ROOT_ID = "live-lens-root";

function getRoot(): HTMLElement {
  let el = document.getElementById(ROOT_ID);
  if (!el) {
    el = document.createElement("div");
    el.id = ROOT_ID;
    document.body.appendChild(el);
  }
  return el;
}

function mount() {
  const root = getRoot();
  if (root.hasAttribute("data-mounted")) return;
  root.setAttribute("data-mounted", "true");
  createRoot(root).render(<ContentUI />);
}

function unmount() {
  const root = document.getElementById(ROOT_ID);
  if (root) {
    root.removeAttribute("data-mounted");
    root.innerHTML = "";
  }
}

chrome.runtime.onMessage.addListener(
  (message: { type: string }, _sender: unknown, sendResponse: (r?: unknown) => void) => {
    if (message.type === "LIVE_LENS_ACTIVATE") {
      mount();
      sendResponse({ ok: true });
    }
    return true;
  }
);

export { mount, unmount };
