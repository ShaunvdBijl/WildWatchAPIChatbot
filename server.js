import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend. Prefer ./public, but fall back to project root so
// deployments that place assets at the repo root still work.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let publicDir = path.join(__dirname, 'public');
let indexPath = path.join(publicDir, 'index.html');
let hasFrontend = fs.existsSync(indexPath);
if (!hasFrontend) {
  // Fallback: try serving from repository root (index.html may be at root)
  publicDir = __dirname;
  indexPath = path.join(publicDir, 'index.html');
  hasFrontend = fs.existsSync(indexPath);
}
if (hasFrontend) {
  app.use(express.static(publicDir));
}
console.log(`Frontend files ${hasFrontend ? 'found' : 'NOT found'} at ${publicDir}`);

// Server configuration from environment variables
const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || 'models/gemini-2.5-flash-lite';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Validate required environment variables
if (!process.env.GOOGLE_API_KEY) {
  console.error('Error: GOOGLE_API_KEY environment variable is required');
  process.exit(1);
}

app.post('/api/generate', async (req, res) => {
  const { text, model, context } = req.body;
  // Normalize model names so callers may pass either
  // 'models/gemini-2.5-flash-lite' or 'gemini-2.5-flash-lite'
  const normalizeModel = (m) => (m || '').replace(/^models\//, '');
  const usedModel = normalizeModel(model || MODEL);
  if (!text) return res.status(400).json({ error: 'missing `text` in body' });

  try {
    // Log the request for debugging
    console.log('Request:', { text, context: context?.slice(0, 100) + '...' });

    const url = `${API_BASE_URL}/models/${usedModel}:generateContent?key=${process.env.GOOGLE_API_KEY}`;
    
    // Prepare the message for the model
    let prompt = text;
    if (context) {
      prompt = `${context}\n\nUser message: ${text}\n\nResponse:`;
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await r.json();
    const botMessage = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text: botMessage, raw: data });
  } catch (err) {
    console.error('Proxy error', err);
    res.status(500).json({ error: String(err) });
  }
});

// List available models from the upstream API so users can pick a supported model
app.get('/api/models', async (req, res) => {
  try {
    console.log('Received request: GET /api/models');
    const url = `${API_BASE_URL}/models?key=${process.env.GOOGLE_API_KEY}`;
    const r = await fetch(url, { method: 'GET' });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error('List models error', err);
    res.status(500).json({ error: String(err) });
  }
});

// Serve the frontend index if present; otherwise expose a simple health string
app.get('/', (req, res) => {
  if (hasFrontend) {
    return res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html', err);
        res.status(500).send('WildWatch proxy running. Available: GET /api/models, POST /api/generate');
      }
    });
  }
  res.send('WildWatch proxy running. Available: GET /api/models, POST /api/generate');
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
