// Removed hard-coded API key. The frontend now calls a local proxy at /api/generate
// which forwards requests to the remote API using a server-side secret.
const MODEL = "gemini-1.5-flash";

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
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model: MODEL })
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
