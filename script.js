// Frontend doesn't have access to process.env. Leave MODEL null so the
// server's MODEL (from .env) is used. To override from the client for
// testing, set this to a model id (for example: 'models/gemini-2.5-flash-lite').
const MODEL = null;


const chatBox = document.getElementById("chat-box");
const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");

sendBtn.addEventListener("click", sendMessage);

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  appendMessage("user", text);
  userInput.value = "";

  // Call the local proxy instead of embedding the API key in the client
  try {
    // If the page is opened via file:// (or not served from the proxy),
    // point at the local proxy on port 3000. When using VS Code Live Server
    // the frontend is served from a different local port (eg. 5500), so
    // we also route API calls to the backend at http://localhost:3000.
    // In production (same origin) API_BASE should be '' so requests are
    // relative to the host serving the frontend.
    let API_BASE = '';
    // If opened from the filesystem or no hostname, target local backend
    if (location.protocol === 'file:' || !location.hostname) {
      API_BASE = 'http://localhost:3000';
    } else {
      // If the frontend is running on a different local port (Live Server
      // commonly uses 127.0.0.1:5500 or localhost:5500), route API calls to
      // the backend at http://localhost:3000. This covers both 'localhost'
      // and '127.0.0.1' hostnames.
      const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if (isLocalhost && location.port && location.port !== '3000') {
        API_BASE = 'http://localhost:3000';
      }
    }

    // Build request body and only include `model` if the client overrides it.
    const bodyObj = { text };
    if (MODEL) bodyObj.model = MODEL;

    const response = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyObj)
    });

    if (!response.ok) {
      const err = await response.text();
      appendMessage('bot', `Error from server: ${err}`);
      return;
    }

    const data = await response.json();
    const botMessage = data?.text || "Sorry, I couldn't understand.";
    appendMessage('bot', botMessage);
  } catch (err) {
    appendMessage('bot', 'Network error: ' + String(err));
  }
}

function appendMessage(sender, text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = sender;
  messageDiv.textContent = text;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}
