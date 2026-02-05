const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Fallback pool for local dev if DATABASE_URL is missing
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'notes_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
};

const activePool = process.env.DATABASE_URL ? pool : new Pool(dbConfig);

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

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const HF_TOKEN = process.env.HF_API_TOKEN;

// Helper: Query Hugging Face
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

    // 1. Try Ollama (Local)
    try {
      const ollamaRes = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3:4b',
          prompt: `Summarize this in ${length} length: ${text}`,
          stream: false,
          options: { num_predict: 250 }
        }),
      });
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        summaryText = data.response;
      }
    } catch (e) { /* Ollama not running */ }

    // 2. Try Hugging Face fallback (Cloud)
    if (!summaryText) {
      summaryText = await queryHF(text);
    }

    // 3. Mock fallback
    if (!summaryText) {
      summaryText = "[Offline] " + text.substring(0, 100) + "...";
    }

    summaryText = summaryText.replace(/^(Here's|Here is|Sure|Okay).*?:/is, '').trim();

    const result = await activePool.query(
      'INSERT INTO summaries (original_text, summary_text) VALUES ($1, $2) RETURNING *',
      [text, summaryText]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Summarization failed' });
  }
});

app.post('/api/suggest', async (req, res) => {
  const { word, context } = req.body;
  try {
    const prompt = `List 3 synonyms for "${word}". Format: word1, word2, word3`;
    let suggestionsRaw = "";

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
    } catch (e) {
      // Simple fallback synonyms if AI is offline
      suggestionsRaw = "choice1, choice2, choice3";
    }

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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  initDb();
});
