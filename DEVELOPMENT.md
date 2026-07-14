# MathGenius Development Guide

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Docker & Docker Compose (optional)

### Setup with Docker (Recommended)

```bash
# Copy environment templates
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Fill in your credentials in both .env files
# Edit backend/.env and frontend/.env with your API keys

# Start both services
docker-compose up -d

# View logs
docker-compose logs -f
```

Backend will be at `http://localhost:8000`
Frontend will be at `http://localhost:5173`

### Manual Setup

#### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r ../requirements.txt
cp .env.example .env

# Edit .env with your credentials
nano .env

# Run server
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
cp .env.example .env

# Edit .env with your API URL
nano .env

npm run dev
```

---

## Testing

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest backend/tests/test_solve.py

# Run only unit tests
pytest -m unit

# Watch mode
pytest-watch
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

---

## Security

### Never Commit Secrets
- `.env` files contain API keys and database credentials
- Always use `.env.example` as a template
- Use environment variables in production
- Rotate any exposed credentials immediately

### Git Pre-commit Hook
Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing .env files
if git diff --cached --name-only | grep -E '\.env$'; then
    echo "ERROR: .env file detected in staging area"
    exit 1
fi
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Configuration from env
│   ├── logging_config.py    # Logging setup
│   ├── middleware.py        # Error & logging middleware
│   ├── database.py          # Database client
│   ├── schemas.py           # Pydantic models
│   ├── errors.py            # Custom exceptions
│   ├── dependencies.py      # Dependency injection
│   ├── routers/             # Route handlers
│   └── services/            # Business logic
├── tests/                   # Test files
└── migrations/              # Database migrations (Alembic)

frontend/
├── src/
│   ├── pages/               # Page components
│   ├── components/          # Reusable components
│   ├── context/             # React Context
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities
│   ├── services/            # API client
│   └── test/                # Test files
└── vitest.config.js         # Test configuration
```

---

## API Documentation

### Auto-generated Docs
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/solve/` | No | Solve math expression |
| POST | `/solve/explain` | Yes | Get explanation |
| POST | `/teach/ask` | Yes | AI tutoring |
| GET | `/health` | No | Health check |

---

## Logging

### Backend Logs
- Console output: Real-time in terminal
- File output: `logs/app.log` (rotated daily)

View logs:
```bash
# Real-time
tail -f logs/app.log

# Search for errors
grep ERROR logs/app.log
```

### Log Levels
- DEBUG: Detailed info for debugging
- INFO: General informational messages
- WARNING: Warning messages
- ERROR: Error messages
- CRITICAL: Critical errors

Set log level via `LOG_LEVEL` env var:
```bash
LOG_LEVEL=DEBUG uvicorn app.main:app --reload
```

---

## Database

### Supabase Setup
1. Create a Supabase project at https://supabase.com
2. Copy the project URL and service role key
3. Add to `backend/.env`

### Required Tables
The app expects these Supabase tables:
- `profiles` — User profiles & onboarding state
- `exam_questions` — Objective questions
- `theory_questions` — Theory questions
- `user_attempts` — Question attempt records
- `study_sessions` — Session logs
- `bookmarks` — Saved questions
- `teach_sessions` — Tutoring interaction logs

---

## Deployment

### Production Checklist
- [ ] All secrets in environment variables (not .env)
- [ ] Database migrations applied
- [ ] Tests pass (100% CI/CD green)
- [ ] Security scan clear (no exposed keys)
- [ ] Error tracking configured (Sentry)
- [ ] Monitoring set up (metrics, logs)

### Deploy with Docker

```bash
# Build image
docker build -t mathgenius:latest .

# Run
docker run -p 8000:8000 \
  -e GROQ_API_KEY=xxx \
  -e SUPABASE_URL=https://xxx.supabase.co \
  -e SUPABASE_SERVICE_KEY=xxx \
  mathgenius:latest
```

---

## Troubleshooting

### Backend won't start
```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check logs
grep ERROR logs/app.log
```

### Frontend can't reach API
```bash
# Check backend is running
curl http://localhost:8000/health

# Check VITE_API_URL in frontend/.env
cat frontend/.env

# Verify CORS is enabled in backend
```

### Tests fail
```bash
# Backend
pytest -v backend/tests/test_solve.py

# Frontend
npm test -- --reporter=verbose
```

---

## Contributing

1. Create a feature branch: `git checkout -b feature/xyz`
2. Make changes and add tests
3. Run tests locally: `pytest` + `npm test`
4. Commit with meaningful message
5. Push and create a PR
6. CI/CD must pass before merge

---

## Resources

- FastAPI Docs: https://fastapi.tiangolo.com
- React Docs: https://react.dev
- Supabase Docs: https://supabase.com/docs
- Pytest Docs: https://pytest.org
- Vitest Docs: https://vitest.dev
