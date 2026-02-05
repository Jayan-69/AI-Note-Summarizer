const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database Setup - High Compatibility for Vercel
const activePool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDb = async () => {
  try {
    await activePool.query(`
      CREATE TABLE IF NOT EXISTS summaries (
        id SERIAL PRIMARY KEY,
        original_text TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) { console.error("DB Init Error:", err.message); }
};

// AI Configurations
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HF_TOKEN = process.env.HF_API_TOKEN;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Helper: Query Gemini (Smart Cloud)
async function queryGemini(prompt) {
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error("Gemini Error:", e.message);
    return null;
  }
}

// Helper: Query Hugging Face (Backup Cloud)
async function queryHF(prompt) {
  if (!HF_TOKEN) return null;
  try {
    const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-cnn", {
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
    });
    const result = await response.json();
    return result[0]?.summary_text || result.summary_text || null;
  } catch (e) { return null; }
}

app.post('/api/summarize', async (req, res) => {
  const { text, length } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    let summaryText = "";
    const prompt = `Task: Summarize the following text in ${length} length. Return ONLY the summary. No intro filler. Text: ${text}`;

    // 1. Try Ollama (Local)
    try {
      const ollamaRes = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3:4b',
          prompt: prompt,
          stream: false,
          options: { num_predict: 500 }
        }),
      });
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        summaryText = data.response;
      }
    } catch (e) { /* Ollama offline */ }

    // 2. Try Gemini (Primary Cloud Fallback)
    if (!summaryText) {
      if (GEMINI_API_KEY) {
        console.log("Attempting Gemini Summarization...");
        summaryText = await queryGemini(prompt);
      } else {
        console.warn("GEMINI_API_KEY is missing! Cannot use cloud AI.");
      }
    }

    // 3. Try Hugging Face (Backup)
    if (!summaryText && HF_TOKEN) {
      console.log("Attempting HuggingFace fallback...");
      summaryText = await queryHF(text);
    }

    if (!summaryText) {
      throw new Error("All AI providers failed. Check your API keys.");
    }

    summaryText = summaryText.replace(/^(Here's|Here is|Sure|Okay).*?:/is, '').trim();

    const result = await activePool.query(
      'INSERT INTO summaries (original_text, summary_text) VALUES ($1, $2) RETURNING *',
      [text, summaryText]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error("SUMMARIZE ERROR:", error.message);
    res.status(500).json({ error: error.message || 'Summarization failed' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGemini: !!GEMINI_API_KEY, hasDb: !!process.env.DATABASE_URL });
});

app.post('/api/suggest', async (req, res) => {
  const { word, context } = req.body;
  try {
    const prompt = `Give me 3 synonyms for the word "${word}" in this context: "${context}". 
Return ONLY the 3 words separated by commas. No other text.`;

    let suggestionsRaw = "";

    // 1. Try Ollama
    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3:4b',
          prompt: prompt,
          stream: false,
          options: { num_predict: 25, temperature: 0.1 }
        }),
      });
      if (response.ok) {
        const data = await response.json();
        suggestionsRaw = data.response;
      }
    } catch (e) { }

    // 2. Try Gemini
    if (!suggestionsRaw && GEMINI_API_KEY) {
      suggestionsRaw = await queryGemini(prompt);
    }

    // Default Fallback
    if (!suggestionsRaw) suggestionsRaw = "choice1, choice2, choice3";

    let suggestions = suggestionsRaw
      .replace(/^(Here are|Sure|Synonyms).*?:/is, '')
      .replace(/[\[\]"`\.\*]/g, '')
      .split(/,|\n/)
      .map(s => s.trim())
      .filter(s => s && s.toLowerCase() !== word.toLowerCase())
      .slice(0, 3);

    res.json(suggestions);
  } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.get('/api/history', async (req, res) => {
  try {
    const result = await activePool.query('SELECT * FROM summaries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) { res.json([]); }
});

app.delete('/api/history/:id', async (req, res) => {
  await activePool.query('DELETE FROM summaries WHERE id = $1', [req.params.id]);
  res.json({ message: 'OK' });
});

app.delete('/api/history-clear', async (req, res) => {
  await activePool.query('DELETE FROM summaries');
  res.json({ message: 'OK' });
});

// Export for Vercel
module.exports = app;

// Ensure DB is initialized
initDb().catch(err => console.error("Async DB Init Error:", err));

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
