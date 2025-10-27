const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MODEL = process.env.MODEL || 'gemini-1.5-flash';

if (!process.env.GOOGLE_API_KEY) {
  console.warn('Warning: GOOGLE_API_KEY not set. Create a .env file (see .env.example)');
}

app.post('/api/generate', async (req, res) => {
  const { text, model } = req.body;
  const usedModel = model || MODEL;
  if (!text) return res.status(400).json({ error: 'missing `text` in body' });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:generateContent?key=${process.env.GOOGLE_API_KEY}`;
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

app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
