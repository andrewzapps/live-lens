This is a Chrome Extension built with HTML, CSS, and JavaScript.

It's called Live Lens.

This is a hackathon submission for this prompt: "Build a software tool that genuinely makes life easier for people with disabilities, helping them overcome everyday digital barriers and interact with technology more comfortably, independently, and confidently."

There should be a keyboard shortcut, which triggers overlay that shows listening for input. It should automatically pick up what the user is speaking.

It should extract the elements on the webpage, with each of its positions. It should know where each element is, then store it in an array. 

Send to OpenAI API (user supplies key in popup), with array of elements, along with the user's query.
- If the user asks about an image element, process it with vision
- Else, process it with a normal model to reduce token usage / costs

Then, get the response and speak it out to the user.

So blind people or low-vision people could actually just say something like: "What is that image in the top right corner?" or "Summarize the key points in this article"