---
description: How to run the AI Note Summarizer locally using Docker
---

1. Ensure Docker Desktop is running.
2. Open a terminal in the project root.
3. Build and start the containers:
// turbo
```bash
docker-compose up --build
```
4. Access the frontend at `http://localhost:5173`.
5. Access the backend API at `http://localhost:5000/health` to verify status.
