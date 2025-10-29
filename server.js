import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
  const { text, model } = req.body;
  // Normalize model names so callers may pass either
  // 'models/gemini-2.5-flash-lite' or 'gemini-2.5-flash-lite'
  const normalizeModel = (m) => (m || '').replace(/^models\//, '');
  const usedModel = normalizeModel(model || MODEL);
  if (!text) return res.status(400).json({ error: 'missing `text` in body' });

  try {
    const url = `${API_BASE_URL}/models/${usedModel}:generateContent?key=${process.env.GOOGLE_API_KEY}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text }] }] })
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

// Simple root/health endpoint to confirm the proxy is running
app.get('/', (req, res) => {
  res.send('WildWatch proxy running. Available: GET /api/models, POST /api/generate');
});

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
