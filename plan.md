User triggers it — keyboard shortcut or toolbar button, on demand. They're on a webpage and hit a wall — an image, a chart, a confusing UI element.
They select what they need help with — either click on a specific element, or ask a free-text question like "what's in this image" or "what does this page look like."
Extension captures context — takes a screenshot of the selected element or full visible page, grabs any surrounding DOM text/alt text that exists, and bundles it together.
Sends to vision AI — screenshot + user question goes to Claude or GPT-4V API.
AI returns a description — conversational, plain English, answers exactly what was asked rather than dumping everything.
Reads it aloud + displays it — text-to-speech output so the user doesn't have to read it, plus a small overlay panel showing the text.
Follow-up questions — user can ask "can you describe just the left side" or "what color is the button" without re-triggering the whole flow. Conversational back and forth on the same context.

build this out with react/ts/tsx/vite

openai vision and key