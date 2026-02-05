const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'notes_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS summaries (
        id SERIAL PRIMARY KEY,
        original_text TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) { console.error(err); }
};

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';

app.post('/api/summarize', async (req, res) => {
  const { text, length } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    // UPDATED PROMPT: More strict, no intro fluff, shorter.
    const prompt = `Task: Summarize the following text.
Length Requirement: ${length} (be concise).
Rules: 
1. Do NOT include any introductory sentences like "Here is a summary".
2. Return ONLY the summarized text itself.
3. Be as brief as possible while keeping key information.

Text to summarize: ${text}`;

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: prompt,
        stream: false,
        options: {
          num_predict: length === 'short' ? 100 : (length === 'medium' ? 250 : 500),
          temperature: 0.4
        }
      }),
    });

    const result = await response.json();
    let summaryText = result.response || "Failed to generate.";

    // Clean up any remaining intro fluff if the AI still includes it
    summaryText = summaryText.replace(/^(Here's|Here is|Sure|Okay).*?:/is, '').trim();

    const newSummary = await pool.query(
      'INSERT INTO summaries (original_text, summary_text) VALUES ($1, $2) RETURNING *',
      [text, summaryText]
    );
    res.json(newSummary.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to summarize' });
  }
});

app.post('/api/suggest', async (req, res) => {
  const { word, context } = req.body;
  try {
    const prompt = `Task: List 3 synonyms for "${word}". 
Rules: Return ONLY the words separated by commas. No intro.
Synonyms:`;

    const response = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: prompt,
        stream: false,
        options: {
          num_predict: 25,
          temperature: 0.1,
          stop: ["\n", "\r"]
        }
      }),
    });
    const result = await response.json();

    // Clean intro fluff like "Here are 3 synonyms for..."
    let suggestions = result.response
      .replace(/^(Here are|Sure|Synonyms|The synonyms|3 synonyms).*?:/is, '')
      .replace(/[\[\]"`\.\*]/g, '')
      .split(/,|\n/)
      .map(s => s.trim().replace(/^[\d\)\.-]+/, ''))
      .filter(s => s && s.toLowerCase() !== word.toLowerCase() && s.length > 1)
      .slice(0, 3);

    res.json(suggestions.length ? suggestions : ['No options found']);
  } catch (error) { res.status(500).json({ error: 'Error' }); }
});

app.get('/api/history', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM summaries ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) { res.json([]); }
});

app.delete('/api/history/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM summaries WHERE id = $1', [req.params.id]);
    res.json({ message: 'OK' });
  } catch (error) { res.status(500).json({ error: 'Fail' }); }
});

app.delete('/api/history-clear', async (req, res) => {
  try {
    await pool.query('DELETE FROM summaries');
    res.json({ message: 'OK' });
  } catch (error) { res.status(500).json({ error: 'Fail' }); }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  initDb();
});
