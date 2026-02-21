# Live Lens

Describe any part of a webpage with AI vision — get spoken and written answers on demand.

- **Trigger**: Toolbar button or `Alt+Shift+D` on any page
- **Select**: Click an element to describe, or use the whole visible page
- **Ask**: Type a question (e.g. “What’s in this image?”, “What does this button do?”)
- **Hear & read**: Response is read aloud and shown in an overlay
- **Follow-ups**: Ask more about the same screenshot (e.g. “What color is the button?”) without starting over

Built with React, TypeScript, Vite, and OpenAI Vision (GPT-4o).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build**
   ```bash
   npm run build
   ```

3. **Load in Chrome**
   - Open `chrome://extensions`
   - Enable “Developer mode”
   - If you already added “Live Lens” and see errors: **Remove** that extension (click Remove).
   - Click **“Load unpacked”**. In the file picker, open your project folder (e.g. `live-lens`), then open the **`dist`** folder inside it. The selected folder must be **`dist`** (you should see `manifest.json`, `service-worker-loader.js`, and an `assets` folder inside it). Click “Select” on that `dist` folder.

4. **Add your API key**
   - Click the Live Lens icon in the toolbar
   - Enter your [OpenAI API key](https://platform.openai.com/api-keys) and click “Save key”

## Usage

- Click the extension icon and then **Describe this page**, or press **Alt+Shift+D** on the page.
- Choose **Use whole page** or **click an element** on the page to describe.
- Type your question and click **Describe**. The answer is spoken and shown in the overlay.
- Use **Follow-up** for more questions about the same image, or **Reselect** to pick a new area.

## Development

- `npm run dev` — build in watch mode (reload the extension in `chrome://extensions` after changes)
- `npm run build` — production build to `dist/`

## Project structure

- `src/popup/` — Toolbar popup (API key, “Describe this page” button)
- `src/content/` — In-page overlay, element selection, capture crop, TTS
- `src/background/` — Service worker: screenshot capture, OpenAI Vision API, conversation state
- `manifest.json` — Extension manifest (MV3)
