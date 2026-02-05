# AI Note Summarizer 📝✨

A premium, full-stack Writing Assistant that uses **Local AI (Ollama)** or **Cloud AI (Google Gemini)** to summarize notes and rephrase content in real-time.

## 🌟 Premium Features
- **Hybrid AI Brain**: Uses **Ollama (Gemma 3)** for local privacy, or **Google Gemini 2.0 Flash** for high-speed cloud hosting.
- **Quillbot-style Rephrasing**: Click any word in the summary for instant AI-powered rephrasing suggestions.
- **Dynamic Length Control**: Choose between **Short**, **Medium**, or **Detailed** summaries.
- **Workspace Management**: Save summaries to a permanent History sidebar with individual delete and "Clear All" options.
- **Glassmorphism UI**: High-end modern design with pulse status indicators.

## 🧰 Tech Stack
- **Frontend**: React + Vite + Lucide Icons
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **AI Engine**: Ollama (Local) / Gemini (Cloud Fallback)

---

## 🛠️ Local Setup

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/) installed.
- [Ollama](https://ollama.com/) installed and running.

### 2. Configure Environment
1. Open `server/.env`.
2. Add your `GEMINI_API_KEY` ([Get one for free here](https://aistudio.google.com/app/apikey)).

### 3. Run with Docker
```bash
docker-compose up --build
```

---

## ☁️ Deployment (Full Features in Cloud)

To get full AI features on Vercel/Render:

1.  **Backend (Render/Railway)**:
    *   Deploy the `server` folder.
    *   Add **Environment Variable**: `GEMINI_API_KEY` (Your Google API Key).
    *   Add **Environment Variable**: `DATABASE_URL` (Your PostgreSQL link).
2.  **Frontend (Vercel)**:
    *   Set **Root Directory** to `client`.
    *   Add **Environment Variable**: `VITE_API_BASE` (Point to your Render Backend URL).

---

## 🏗️ Project Structure
- `/client`: React writing studio UI
- `/server`: Node.js API with Gemini + Ollama support
- `docker-compose.yml`: Local setup
