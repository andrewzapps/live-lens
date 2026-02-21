const STORAGE_KEY = "live-lens-openai-key";

type AskPayload = {
  type: "LIVE_LENS_ASK";
  imageDataUrl: string;
  question: string;
  contextText?: string;
  conversationId?: string;
};

type StoredConversation = {
  imageDataUrl: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

const conversations = new Map<string, StoredConversation>();

chrome.runtime.onMessage.addListener(
  (
    message: AskPayload | { type: string; fullPage?: boolean; rect?: { x: number; y: number; width: number; height: number } },
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (message.type === "LIVE_LENS_CAPTURE") {
      captureTab()
        .then((dataUrl) => sendResponse({ dataUrl }))
        .catch((err) => sendResponse({ error: String(err) }));
      return true;
    }
    if (message.type !== "LIVE_LENS_ASK") return;
    const payload = message as AskPayload;
    handleAsk(payload)
      .then(sendResponse)
      .catch((err) => sendResponse({ error: String(err) }));
    return true; // keep channel open for async sendResponse
  }
);

function captureTab(): Promise<string> {
  return chrome.tabs.captureVisibleTab({ format: "png" });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "describe-page") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: "LIVE_LENS_ACTIVATE" }).catch(() => {});
      }
    });
  }
});

async function getApiKey(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (r) => resolve(r[STORAGE_KEY] || ""));
  });
}

async function handleAsk(
  payload: AskPayload
): Promise<{ text: string; conversationId: string } | { error: string }> {
  const apiKey = await getApiKey();
  if (!apiKey?.trim()) {
    return { error: "OpenAI API key not set. Open the extension popup and add your key." };
  }

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });
  type MessageParam = Parameters<typeof openai.chat.completions.create>[0]["messages"][number];

  const conversationId = payload.conversationId ?? `conv-${Date.now()}`;
  let stored = conversations.get(conversationId);

  if (!stored) {
    stored = {
      imageDataUrl: payload.imageDataUrl,
      messages: [{ role: "user" as const, content: buildUserMessage(payload) }],
    };
    conversations.set(conversationId, stored);
  } else {
    stored.messages.push({ role: "user" as const, content: buildUserMessage(payload) });
  }

  const imagePart = {
    type: "image_url" as const,
    image_url: { url: stored.imageDataUrl },
  };

  const messages: MessageParam[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant describing web page content from a screenshot. Answer concisely in plain English. If the user asks about a specific part (e.g. 'left side', 'the button'), focus on that. Do not dump everything; answer exactly what was asked.",
    },
    ...stored.messages.slice(0, -1).map((m) =>
      m.role === "user"
        ? { role: "user" as const, content: [{ type: "text" as const, text: m.content }, imagePart] }
        : { role: "assistant" as const, content: m.content }
    ),
    {
      role: "user",
      content: [
        { type: "text" as const, text: stored.messages[stored.messages.length - 1].content },
        imagePart,
      ],
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 1024,
    });
    const text = completion.choices[0]?.message?.content?.trim() ?? "No response.";
    stored.messages.push({ role: "assistant", content: text });
    return { text, conversationId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

function buildUserMessage(payload: AskPayload): string {
  let content = payload.question.trim() || "What do you see in this image? Describe it briefly.";
  if (payload.contextText?.trim()) {
    content += `\n\n[Context from the page:\n${payload.contextText.slice(0, 2000)}\n]`;
  }
  return content;
}
