# MathGenius

AI-powered mathematics learning platform with a FastAPI backend and React + Vite frontend.

## Overview
MathGenius combines symbolic math solving, AI tutoring, exam practice, CBT flows, and progress tracking for Nigerian exam prep (WAEC, JAMB, NECO, BECE, NABTEB).

## Tech Stack
- Frontend: React 19, Vite 7, Tailwind CSS 4, Supabase JS
- Backend: FastAPI, SymPy, Groq SDK, Httpx
- AI/RAG: Groq LLMs + local Qdrant vector store + SentenceTransformers
- Data/Storage: Supabase (Auth + PostgREST + Storage), local JSON/Markdown/PDF datasets

## Project Structure
```text
Math_Genius/
  backend/
    app/
      main.py
      routers/
      services/
      rag/
    books/
    images/
    *.py (ingest/scrape/upload utilities)
  frontend/
    src/
    public/
    package.json
```

## Requirements

### System
- Python 3.11+ (3.14 currently used in this workspace)
- Node.js 20+
- npm 10+

### Python packages
Install from `requirements.txt` in project root.

### Frontend packages
Install from `frontend/package.json` with `npm install`.

## Environment Variables

### Backend (`backend/.env`)
```env
GROQ_API_KEY=your_groq_api_key
APP_NAME=MathGenius
ENVIRONMENT=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Local Setup

### 1. Backend
From project root:
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install --upgrade pip
pip install -r ../requirements.txt
```

Run API server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend health check:
- `GET http://127.0.0.1:8000/`

### 2. Frontend
From project root:
```bash
cd frontend
npm install
npm run dev
```

Frontend dev URL (default):
- `http://localhost:5173`

## Core Backend Routes

### Solve
- `POST /solve/`
- `POST /solve/explain`
- `POST /solve/image`
- `POST /solve/practice/question`
- `POST /solve/practice/grade`

### Teach
- `POST /teach/ask`
- `POST /teach/overview`
- `GET /teach/topics`
- `GET /teach/wiki/{topic}`

### Exams
- `POST /exams/ask`
- `POST /exams/ingest`
- `GET /exams/papers`

### CBT
- `POST /cbt/parse`
- `POST /cbt/explain`
- `POST /cbt/report-summary`
- `POST /cbt/classify-difficulty`
- `POST /cbt/verify-answers`
- `GET /cbt/daily-challenge`
- `POST /cbt/generate-mcq`

### Tracking
- `POST /tracking/session/start`
- `POST /tracking/session/end`
- `POST /tracking/attempt`
- `GET /tracking/profile/{user_id}`
- `PUT /tracking/profile/{user_id}`
- `GET /tracking/stats/{user_id}`
- `GET /tracking/topics/{user_id}`
- `GET /tracking/history/{user_id}`
- `POST /tracking/teach-log`
- `POST /tracking/streak/update`
- `GET /tracking/weak-topics/{user_id}`

### Additional solution endpoint
- `POST /api/solution` (from `backend/solution_generator.py`)

## RAG Pipeline (Optional)
If you want textbook-grounded answers:
1. Add PDF books to `backend/books/`
2. Run:
```bash
cd backend
python -m app.rag.ingest
```
3. Vector store is created under `backend/qdrant_db/`

## Useful Utility Scripts
In `backend/`, there are scripts for scraping, upload, verification, and cleanup (e.g., `upload_questions.py`, `upload_theory.py`, `scraper.py`, `verify_answers.py`, `fix_missing_options.py`).

## Development Notes
- Backend CORS currently allows:
  - `http://localhost:5173`
  - `http://localhost:3000`
- Static images are served from `backend/images` at `/images`.
- Frontend API base defaults to `http://localhost:8000` when `VITE_API_URL` is missing.

## Security Notes
- Never commit real `.env` files with production secrets.
- Rotate exposed API keys if they were ever committed/shared.
- Keep Supabase service role key backend-only.

## Troubleshooting
- `ModuleNotFoundError`: confirm backend venv is activated and `pip install -r ../requirements.txt` completed.
- Frontend cannot reach API: verify `VITE_API_URL` and backend is running on port `8000`.
- Groq errors: verify `GROQ_API_KEY` in `backend/.env`.
- Supabase 401/403: verify URL/key pair and that service key is only used in backend.
- No RAG context returned: ensure ingest was run and `backend/qdrant_db` has vectors.

## License
No license file detected in this repository. Add one if you plan to distribute publicly.
