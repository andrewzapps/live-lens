# Live Lens

Voice-powered assistant for blind and low-vision users to understand web pages. Ask about any page in natural language; get answers spoken or in large, high-contrast text.

## Features

- Voice input - Ask questions in natural language (e.g. “What is that image in the top right?” or “Summarize the key points in this article”).
- Page awareness - Uses layout and element positions so answers can refer to “top right”, “first paragraph”, and similar.
- Image descriptions - When you ask about images, responses use a vision model for accurate descriptions.
- Spoken or on-screen output - Choose voice (multiple languages and voices via Deepgram) or large, bold on-screen text for readability.
- Your API keys - You supply and store your own OpenAI and Deepgram keys in the extension; you control usage and cost.

## Install (Chrome extension)

1. Get the code
   - Clone or download this repo:
     ```bash
     git clone https://github.com/andrewzapps/live-lens.git
     cd live-lens
     ```
2. Load the extension in Chrome
   - Open `chrome://extensions`.
   - Turn on Developer mode (top right).
   - Click Load unpacked and select the `extension` folder inside the repo.
3. Configure
   - Click the Live Lens icon in the toolbar to open the popup.
   - Enter your OpenAI API key and Deepgram API key.
   - Choose Voice, Language (speech output), and Response mode (Speak vs Show on screen).
   - Click Save.

## Usage

- Start Live Lens: Use the keyboard shortcut Command+Shift+L (Mac) or Ctrl+Shift+L (Windows/Linux), or click the extension icon.
- Ask: When the overlay shows it’s listening, speak your question. The extension will use the current page and your query to answer.
- Response: You’ll hear the answer or see it in large text, depending on your settings.