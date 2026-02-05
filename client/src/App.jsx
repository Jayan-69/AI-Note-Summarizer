import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Trash2,
  Copy,
  History,
  Sparkles,
  XOctagon,
  CheckCircle2,
  Clock,
  Type,
  Eraser
} from 'lucide-react';
import './index.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

function App() {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [length, setLength] = useState('medium');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedWord, setSelectedWord] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const summaryRef = useRef(null);

  useEffect(() => {
    fetchHistory();
    const closeMenu = () => setSuggestions([]);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_BASE}/history`);
      setHistory(res.data);
    } catch (err) { console.error(err); }
  };

  const handleSummarize = async () => {
    if (!inputText.trim() || loading) return;
    setLoading(true);
    setError(''); setSummary('');
    try {
      const res = await axios.post(`${API_BASE}/summarize`, { text: inputText, length });
      setSummary(res.data.summary_text);
      fetchHistory();
    } catch (err) { setError('Connection error.'); } finally { setLoading(false); }
  };

  const deleteItem = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API_BASE}/history/${id}`);
      fetchHistory();
    } catch (err) { alert('Delete failed'); }
  };

  const clearHistory = async () => {
    if (!window.confirm("Clear all history?")) return;
    try {
      await axios.delete(`${API_BASE}/history-clear`);
      setHistory([]);
    } catch (err) { alert('Clear failed'); }
  };

  const handleWordClick = async (e) => {
    if (loading || !summary) return;

    let selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    let range = selection.getRangeAt(0);
    let node = range.startContainer;
    let offset = range.startOffset;

    if (node.nodeType !== Node.TEXT_NODE) return;

    let text = node.textContent;
    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1])) start--;
    let end = offset;
    while (end < text.length && /\w/.test(text[end])) end++;

    let word = text.slice(start, end).trim();
    if (word.length < 2) return;

    const rect = range.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 5,
      left: Math.min(rect.left, window.innerWidth - 180)
    });

    setSelectedWord({ word, node, start, end });
    setSuggestions(['Loading...']);

    try {
      const res = await axios.post(`${API_BASE}/suggest`, { word, context: summary });
      setSuggestions(res.data.length ? res.data : ['No synonyms found']);
    } catch (err) { setSuggestions(['Error fetching']); }
    e.stopPropagation();
  };

  const replaceWord = (newWord) => {
    if (!selectedWord) return;
    const { node, start, end } = selectedWord;
    node.textContent = node.textContent.slice(0, start) + newWord + node.textContent.slice(end);
    setSummary(summaryRef.current.innerText);
    setSuggestions([]);
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="logo-text">AI Note Summarizer</h1>
        <div className="status-badge">
          <span className={`pulse ${loading ? 'active' : ''}`}></span>
          {loading ? 'AI PROCESSING' : 'LOCAL AI READY'}
        </div>
      </header>

      <main className="main-content">
        <section className="card editor-card">
          <div className="controls-bar">
            <div className="length-selector">
              {['short', 'medium', 'detailed'].map(l => (
                <button key={l} className={`length-btn ${length === l ? 'active' : ''}`} onClick={() => setLength(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <button className="btn-primary" onClick={handleSummarize} disabled={loading || inputText.length < 5}>
              {loading ? <span className="spinner"></span> : <><Sparkles size={14} /> SUMMARIZE</>}
            </button>
          </div>

          <div className="editor-grid">
            <div className="input-area">
              <div className="area-label"><Type size={12} /> Input Notes</div>
              <textarea
                placeholder="Paste notes here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              ></textarea>
            </div>
            <div className="divider-v"></div>
            <div className="output-area">
              <div className="area-label">
                <Sparkles size={12} /> Final Summary
                <span className="hint-text">(Click word to rephrase)</span>
              </div>
              {loading ? (
                <div className="loading-placeholder">
                  <div className="shimmer-line"></div>
                  <div className="shimmer-line shorter"></div>
                </div>
              ) : (
                <div
                  className="editable-summary"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setSummary(e.currentTarget.innerText)}
                  onClick={handleWordClick}
                  ref={summaryRef}
                >
                  {summary}
                </div>
              )}
              {summary && !loading && (
                <button className="copy-btn-inline" onClick={() => { navigator.clipboard.writeText(summary); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }}>
                  {copySuccess ? <CheckCircle2 size={12} /> : <Copy size={12} />} Copy
                </button>
              )}
            </div>
          </div>
        </section>

        {suggestions.length > 0 && (
          <div className="suggestion-menu" style={{ top: menuPos.top, left: menuPos.left }} onClick={(e) => e.stopPropagation()}>
            <div className="menu-header">REPHRASE "{selectedWord?.word}"</div>
            {suggestions.map((s, i) => (
              <button key={i} className="menu-item" disabled={s === 'Loading...'} onClick={() => replaceWord(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <aside className="card sidebar">
          <div className="sidebar-header">
            <h2 style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <History size={16} /> HISTORY
            </h2>
            {history.length > 0 && (
              <button className="clear-all-btn" onClick={clearHistory}>
                <Eraser size={12} /> CLEAR ALL
              </button>
            )}
          </div>

          <div className="history-list">
            {history.map((item) => (
              <div key={item.id} className="history-item" onClick={() => { setInputText(item.original_text); setSummary(item.summary_text); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="history-date">{new Date(item.created_at).toLocaleDateString()}</div>
                  <button className="delete-item-btn" onClick={(e) => deleteItem(e, item.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="history-preview">{item.summary_text}</p>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
