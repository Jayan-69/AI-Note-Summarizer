# AI Note Summarizer 📝✨

A modern, full-stack AI-powered web application that summarizes long notes using the HuggingFace BART model.

## 🚀 Features
- **Modern UI**: Dark mode, glassmorphism, and responsive design.
- **AI-Powered**: Summarizes text using state-of-the-art NLP models.
- **History**: Automatically saves summaries to a PostgreSQL database.
- **Dockerized**: Easy setup with Docker and Docker Compose.
- **CI/CD**: Automated testing and build via GitHub Actions.

## 🧰 Tech Stack
- **Frontend**: React + Vite + Axios
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **AI**: HuggingFace API (BART model)
- **Containerization**: Docker & Docker Compose
- **Deploy**: Cloud (Render)

---

## 🛠️ Local Setup

### 1. Prerequisites
- Docker & Docker Compose installed.
- A HuggingFace API Token (Free). [Get it here](https://huggingface.co/settings/tokens).

### 2. Configure Environment
1. Open `server/.env`.
2. Replace `YOUR_HF_TOKEN` with your actual HuggingFace API Token.

### 3. Run with Docker
In the root directory, run:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

---

## ☁️ Deployment (Render)

1. **GitHub**: Push this repository to GitHub.
2. **Database**: Create a "Free Instance" of PostgreSQL on Render.
3. **Web Service (Backend)**:
   - Create a Web Service for the `server` folder.
   - Use the `Dockerfile` in the server folder.
   - Add Environment Variables (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_NAME`, `HF_API_TOKEN`).
4. **Static Site (Frontend)**:
   - Create a Static Site for the `client` folder.
   - Build Command: `npm run build`
   - Publish Directory: `dist`
   - Add Environment Variable `VITE_API_BASE` for your backend URL.

---

## 🏗️ Project Structure
- `/client`: React frontend
- `/server`: Express backend & AI logic
- `/.github`: CI/CD workflows
- `docker-compose.yml`: Local orchestration
