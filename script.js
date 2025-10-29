// Frontend doesn't have access to process.env. Leave MODEL null so the
// server's MODEL (from .env) is used. To override from the client for
// testing, set this to a model id (for example: 'models/gemini-2.5-flash-lite').
const MODEL = null;

// Helper function to get API base URL
function getApiBase() {
  let API_BASE = '';
  if (location.protocol === 'file:' || !location.hostname) {
    API_BASE = 'http://localhost:3000';
  } else {
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (isLocalhost && location.port && location.port !== '3000') {
      API_BASE = 'http://localhost:3000';
    }
  }
  return API_BASE;
}

// System messages to guide the AI's behavior
const SYSTEM_MESSAGES = {
  general: "You are the BC WildWatch assistant, helping users with wildlife-related questions and concerns on campus. Be informative and safety-conscious.",
  safety: `You are the BC WildWatch safety advisor. Provide clear, structured wildlife safety information in this format:
1. General guidelines
2. Specific do's and don'ts
3. Prevention tips
4. Emergency contact information

Formatting rules:
- Friendly introduction
- Use normal sentences with full stops
- Use line breaks between sections (\n)
- Do not use symbols like *, **, #, or -
- Do not use Markdown
- Make use of bullet points for lists, use this •
- Do not over use capitalization
- Always use numbers to indicate headings

Be clear, practical, and focused on campus safety.`,

  emergency: `You are the BC WildWatch emergency response advisor. This is an urgent situationin plain text only (no markdown or symbols such as ###, **, or *). Respond with:
1. IMMEDIATE ACTIONS (what to do right now)
2. SAFETY INSTRUCTIONS (stay/leave, keep distance, etc.)
3. CONTACT INFO (who to call - security, emergency services)
4. FOLLOW-UP (what to do after the immediate situation)

Formatting rules:
- Use normal sentences with full stops
- Use line breaks between sections (\n)
- Do not use symbols like *, **, #, or -
- Do not use Markdown
- Make use of bullet points for lists, use this •
- Do not over use capitalization

Use clear, direct language. Prioritize human safety.`,

  report: `You are the BC WildWatch incident response assistant. Your role is to help handle wildlife incidents on campus.

For this incident report, please provide a response in this format:
1. Acknowledge receipt: "Thank you for reporting this incident."
2. Safety first: If there's any immediate danger, provide urgent safety instructions.
3. Specific guidance: Based on the incident type and animal, give relevant advice.
4. Next steps: List clear actions (e.g., "Please notify campus security at [number]", "Avoid the area", etc.)
5. Follow-up: Ask for any critical missing information.

Remember:
- Be professional but reassuring
- Prioritize human safety
- Be specific about actions to take
- Give clear contact information when needed
- do not use markdown symbols such as ###, **, or *.
- use \n for new lines

Formatting rules:
- Use normal sentences with full stops
- Use line breaks between sections (\n)
- Do not use symbols like *, **, #, or -
- Do not use Markdown
- Make use of bullet points for lists, use this •
- Do not over use capitalization`
};

const chatBox = document.getElementById("chat-box");
const sendBtn = document.getElementById("send-btn");
const userInput = document.getElementById("user-input");
const contextSelector = document.getElementById("context-selector");
const quickActions = document.querySelectorAll(".action-btn");
const incidentForm = document.getElementById("incident-form");
const submitIncident = document.getElementById("submit-incident");
const cancelReport = document.getElementById("cancel-report");

// Event Listeners
sendBtn.addEventListener("click", sendMessage);
quickActions.forEach(btn => btn.addEventListener("click", handleQuickAction));
submitIncident.addEventListener("click", submitIncidentReport);
cancelReport.addEventListener("click", () => incidentForm.classList.add("hidden"));

async function handleQuickAction(event) {
  const action = event.target.dataset.action;
  switch(action) {
    case "report":
      incidentForm.classList.remove("hidden");
      break;
    case "safety":
      userInput.value = "What are the general safety guidelines for wildlife encounters on campus?";
      contextSelector.value = "safety";
      sendMessage();
      break;
    case "emergency":
      userInput.value = "I need immediate assistance with a wildlife situation.";
      contextSelector.value = "emergency";
      sendMessage();
      break;
  }
}

async function submitIncidentReport() {
  const type = document.getElementById("incident-type").value;
  const location = document.getElementById("incident-location").value;
  const details = document.getElementById("incident-details").value;
  
  if (!type || !location || !details) {
    appendMessage("bot", "Please fill in all fields in the incident report.");
    return;
  }

  // Create a structured report object
  const reportData = {
    type,
    location,
    details,
    timestamp: new Date().toISOString()
  };

  appendMessage("user", `📝 Reporting ${type} incident at ${location}`);

  try {
    const API_BASE = getApiBase(); // Reuse the API base URL logic
    const response = await fetch(`${API_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `Please provide guidance for this wildlife incident report:
Type of incident: ${type}
Location: ${location}
Details: ${details}`,
        context: SYSTEM_MESSAGES.report
      })
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    appendMessage('bot', data.text || "Sorry, I couldn't process the report. Please try again.");

  } catch (err) {
    appendMessage('bot', 'Error submitting report: ' + err.message);
  }

  incidentForm.classList.add("hidden");
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  const context = contextSelector.value;

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
    const API_BASE = getApiBase();

    // Build request body with context and system message
    const systemMessage = SYSTEM_MESSAGES[context] || SYSTEM_MESSAGES.general;
    const bodyObj = {
      text,
      context: systemMessage
    };
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
  messageDiv.style.whiteSpace = "pre-line";
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}
