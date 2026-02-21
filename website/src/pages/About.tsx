export default function About() {
  return (
    <>
      <h1 style={{ fontWeight: 700, marginBottom: '1rem' }}>About</h1>
      <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5em' }}>
        Live Lens is a browser extension that helps blind and low-vision users understand web pages using voice. You speak a question; Live Lens uses the page structure and your query to give a spoken or on-screen answer.
      </p>

      <h2 style={{ fontWeight: 600, fontSize: '1.125rem', marginTop: '2em', marginBottom: '0.5em' }}>How it works</h2>
      <ul style={{ color: 'rgba(255,255,255,0.85)', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
        <li>Use the keyboard shortcut (e.g. Command+Shift+L) or click the extension icon to start.</li>
        <li>An overlay shows when Live Lens is listening. Speak your question, e.g. "What is that image in the top right?" or "Summarize the key points in this article."</li>
        <li>The extension collects elements and their positions on the page, then sends your query and that context to the OpenAI API (you supply your own API key in the popup).</li>
        <li>Images can be processed with vision when you ask about them; other content uses a standard model to keep usage and cost lower.</li>
        <li>You get the answer either by voice (via Deepgram) or as large, bold text on screen. Choose in the extension settings.</li>
      </ul>

      <h2 style={{ fontWeight: 600, fontSize: '1.125rem', marginTop: '2em', marginBottom: '0.5em' }}>Features</h2>
      <ul style={{ color: 'rgba(255,255,255,0.85)', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.7 }}>
        <li>Voice input: ask in natural language about the current page.</li>
        <li>Page awareness: uses layout and element positions to answer “top right”, “first paragraph”, etc.</li>
        <li>Image descriptions: vision model used when you ask about images.</li>
        <li>Spoken or on-screen output: choose voice (multiple languages and voices) or large, high-contrast text.</li>
        <li>Your keys: OpenAI and Deepgram API keys stay in your browser; you control usage and cost.</li>
      </ul>
    </>
  )
}
