# AI Note Summarizer 📝✨

A premium, full-stack Writing Assistant that uses **Local AI (Ollama + Gemma 3)** to summarize notes and rephrase content in real-time. Designed with a sleek, glassmorphism UI.

## 🌟 Premium Features
- **Local AI Context**: Uses your machine's power for 100% private, fast summarization (Ollama fallback to HuggingFace).
- **Quillbot-style Rephrasing**: Click any word in the summary for instant AI-powered rephrasing suggestions.
- **Dynamic Length Control**: Choose between **Short**, **Medium**, or **Detailed** summaries.
- **Workspace Management**: Save summaries to a permanent History sidebar with individual delete and "Clear All" options.
- **Copy to Clipboard**: Quick copy for your results.
- **Glassmorphism UI**: High-end modern design with pulse status indicators and smooth animations.

## 🧰 Tech Stack
- **Frontend**: React + Vite + Lucide Icons + CSS Inter
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Dockerized)
- **AI Engine**: Ollama (Running Gemma 3:4b locally)
- **Containerization**: Docker & Docker Compose

---

## 🛠️ Local Setup

### 1. Prerequisites
- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/) installed.
- [Ollama](https://ollama.com/) installed and running on your host machine.
- Run `ollama pull gemma3:4b` to download the model.

### 2. Configure Environment
1. Check `server/.env` to ensure your database credentials match (default is `postgres`).
2. (Optional) Add `HF_API_TOKEN` if you want a cloud fallback if Ollama is off.

### 3. Run with Docker
In the root directory, run:
```bash
docker-compose up --build
```
- **App**: `http://localhost:5173`
- **API**: `http://localhost:5000`

---

## ☁️ Deployment (Vercel + Cloud)

1. **Frontend (Vercel)**:
   - Connect your GitHub repo to Vercel.
   - Point the root directory to `client`.
   - Set Build Command: `npm run build`
   - Set Output Directory: `dist`
   - **Environment Variable**: `VITE_API_BASE` (Point this to your deployed backend URL).

2. **Backend (Render/Heroku/Railway)**:
   - Deploy the `server` folder using its `Dockerfile`.
   - Setup a PostgreSQL database and provide the connection variables.
   - **Note**: Rephrasing requires Ollama. For cloud hosting, you would need to point `OLLAMA_URL` to a cloud GPU provider or use the HuggingFace fallback logic.

---

## 🏗️ Project Structure
- `/client`: React writing studio & UI
- `/server`: API, rephrasing logic, and DB integration
- `docker-compose.yml`: Local setup for the full stack
