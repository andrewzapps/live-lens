import React, { useCallback, useState } from "react";

type Mode = "idle" | "selecting" | "asking" | "loading" | "result" | "followup";

export default function ContentUI() {
  const [mode, setMode] = useState<Mode>("idle");
  const [question, setQuestion] = useState("");
  const [selectedRect, setSelectedRect] = useState<DOMRect | null>(null);
  const [fullPage, setFullPage] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [contextText, setContextText] = useState("");

  const close = useCallback(() => {
    setMode("idle");
    setQuestion("");
    setSelectedRect(null);
    setFullPage(false);
    setResponse("");
    setError("");
    setConversationId(null);
    setImageDataUrl(null);
    setContextText("");
    document.querySelectorAll(".live-lens-highlight").forEach((el) => el.remove());
  }, []);

  const startSelect = useCallback(() => {
    setMode("selecting");
    setError("");
    setResponse("");
    setFullPage(false);
    setSelectedRect(null);
    document.querySelectorAll(".live-lens-highlight").forEach((el) => el.remove());
  }, []);

  const useFullPage = useCallback(() => {
    setFullPage(true);
    setSelectedRect(null);
    setMode("asking");
    document.querySelectorAll(".live-lens-highlight").forEach((el) => el.remove());
  }, []);

  React.useEffect(() => {
    if (mode !== "selecting") return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(`#${document.getElementById("live-lens-root")?.id || "live-lens-root"}`)) return;
      e.preventDefault();
      e.stopPropagation();
      document.querySelectorAll(".live-lens-highlight").forEach((el) => el.remove());
      const rect = (e.target as Element).getBoundingClientRect();
      const hl = document.createElement("div");
      hl.className = "live-lens-highlight";
      hl.style.cssText = `position: fixed; left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px;`;
      document.body.appendChild(hl);
      setSelectedRect(rect);
      const el = e.target as HTMLElement;
      const text = el.innerText?.slice(0, 1500) || (el as HTMLImageElement).alt || "";
      setContextText(text);
      setMode("asking");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [mode]);

  const cropImageToRect = useCallback(
    (fullDataUrl: string, rect: DOMRect): Promise<string> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const dpr = window.devicePixelRatio || 1;
          const x = rect.x * dpr;
          const y = rect.y * dpr;
          const w = Math.min(rect.width * dpr, img.width - x);
          const h = Math.min(rect.height * dpr, img.height - y);
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, w);
          canvas.height = Math.max(1, h);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("No canvas context"));
            return;
          }
          ctx.drawImage(img, x, y, w, h, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = fullDataUrl;
      }),
    []
  );

  const captureAndAsk = useCallback(async () => {
    setError("");
    setResponse("");
    setMode("loading");

    chrome.runtime.sendMessage(
      { type: "LIVE_LENS_CAPTURE" },
      async (captureResponse: { dataUrl?: string; error?: string }) => {
        if (captureResponse?.error) {
          setError(captureResponse.error);
          setMode("asking");
          return;
        }
        let dataUrl = captureResponse?.dataUrl;
        if (!dataUrl) {
          setError("Could not capture screenshot.");
          setMode("asking");
          return;
        }
        if (selectedRect && selectedRect.width > 0 && selectedRect.height > 0) {
          try {
            dataUrl = await cropImageToRect(dataUrl, selectedRect);
          } catch {
            setError("Could not crop selection.");
            setMode("asking");
            return;
          }
        }
        setImageDataUrl(dataUrl);

        chrome.runtime.sendMessage(
          {
            type: "LIVE_LENS_ASK",
            imageDataUrl: dataUrl,
            question: question.trim() || "What do you see? Describe it briefly.",
            contextText: contextText || undefined,
            conversationId: conversationId ?? undefined,
          },
          (askResponse: { text?: string; conversationId?: string; error?: string }) => {
            if (askResponse?.error) {
              setError(askResponse.error);
              setMode("result");
              return;
            }
            setResponse(askResponse?.text ?? "");
            if (askResponse?.conversationId) setConversationId(askResponse.conversationId);
            setMode("result");
            try {
              const u = new SpeechSynthesisUtterance(askResponse?.text ?? "");
              u.rate = 0.95;
              speechSynthesis.speak(u);
            } catch (_) {}
          }
        );
      }
    );
  }, [question, fullPage, selectedRect, contextText, conversationId, cropImageToRect]);

  const askFollowUp = useCallback(() => {
    setResponse("");
    setError("");
    setMode("loading");
    if (!imageDataUrl) {
      setError("No image in context.");
      setMode("result");
      return;
    }
    chrome.runtime.sendMessage(
      {
        type: "LIVE_LENS_ASK",
        imageDataUrl,
        question: question.trim() || "Anything else?",
        contextText: contextText || undefined,
        conversationId: conversationId ?? undefined,
      },
      (askResponse: { text?: string; conversationId?: string; error?: string }) => {
        if (askResponse?.error) {
          setError(askResponse.error);
          setMode("result");
          return;
        }
        setResponse(askResponse?.text ?? "");
        if (askResponse?.conversationId) setConversationId(askResponse.conversationId);
        setMode("result");
        setQuestion("");
        try {
          const u = new SpeechSynthesisUtterance(askResponse?.text ?? "");
          u.rate = 0.95;
          speechSynthesis.speak(u);
        } catch (_) {}
      }
    );
  }, [question, imageDataUrl, contextText, conversationId]);

  if (mode === "idle") return null;

  return (
    <>
      <div className="live-lens-backdrop" onClick={close} aria-hidden />
      <div className="live-lens-overlay">
        <h3>Live Lens</h3>
        {mode === "selecting" && (
          <>
            <div className="live-lens-input-wrap">
              <p style={{ margin: "0 0 8px", color: "#aaa", fontSize: "13px" }}>
                Click an element to describe, or use the whole page.
              </p>
            </div>
            <div className="live-lens-actions">
              <button type="button" className="live-lens-btn" onClick={useFullPage}>
                Use whole page
              </button>
              <button type="button" className="live-lens-btn secondary" onClick={close}>
                Cancel
              </button>
            </div>
          </>
        )}
        {(mode === "asking" || mode === "loading" || mode === "result") && (
          <>
            <div className="live-lens-input-wrap">
              <input
                type="text"
                placeholder="e.g. What's in this image? What does this button do?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && captureAndAsk()}
                disabled={mode === "loading"}
              />
            </div>
            <div className="live-lens-actions">
              {!response ? (
                <button
                  type="button"
                  className="live-lens-btn"
                  onClick={captureAndAsk}
                  disabled={mode === "loading"}
                >
                  {mode === "loading" ? "Asking…" : "Describe"}
                </button>
              ) : (
                <button
                  type="button"
                  className="live-lens-btn"
                  onClick={askFollowUp}
                  disabled={mode === "loading" || !question.trim()}
                >
                  {mode === "loading" ? "Asking…" : "Follow-up"}
                </button>
              )}
              <button type="button" className="live-lens-btn secondary" onClick={startSelect}>
                Reselect
              </button>
              <button type="button" className="live-lens-btn secondary" onClick={close}>
                Close
              </button>
            </div>
            {(mode === "loading" || response || error) && (
              <div
                className={`live-lens-response ${mode === "loading" ? "loading" : ""} ${error ? "error" : ""}`}
              >
                {mode === "loading" && !response && !error && "Asking AI…"}
                {error && error}
                {response && !error && response}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
