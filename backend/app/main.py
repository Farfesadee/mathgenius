import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.logging_config import setup_logging, get_logger
from app.middleware import ErrorHandlingMiddleware, LoggingMiddleware
from app.routers import solve, teach
from app.routers.exams import router as exams_router
from app.routers.cbt import router as cbt_router
from app.routers.tracking import router as tracking_router
from app.routers.past_questions import router as past_questions_router
from app.routers.study_plan import router as study_plan_router
from app.routers.health import router as health_router
from solution_generator import router as solution_router

setup_logging()
logger = get_logger(__name__)

# ── Rate limiter (shared across all routers) ──────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── API Configuration ────────────────────────────────────────────────
app = FastAPI(
    title="MathGenius API",
    description="AI-powered mathematics learning platform",
    version="1.0.0",
    docs_url=None if settings.environment == "production" else "/docs",
    redoc_url=None if settings.environment == "production" else "/redoc",
    openapi_url=None if settings.environment == "production" else "/openapi.json",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Middleware (order matters) ─────────────────────────────────────────
app.add_middleware(LoggingMiddleware)
app.add_middleware(ErrorHandlingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origin_list,
    # Safety net: any mathgenius.guru subdomain (apex, www, previews) is
    # always allowed, even if ALLOWED_ORIGINS is misconfigured or empty.
    allow_origin_regex=r"https://([a-z0-9-]+\.)*mathgenius\.guru",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler ────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Unhandled exception in {request.method} {request.url.path}",
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error. Please try again."}
    )

# ── Routers ────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(solve.router)
app.include_router(teach.router)
app.include_router(exams_router)
app.include_router(cbt_router)
app.include_router(tracking_router)
app.include_router(past_questions_router)
app.include_router(solution_router)
app.include_router(study_plan_router)

# ── Static Files ───────────────────────────────────────────────────────
_IMAGES_DIR = Path(__file__).resolve().parent.parent / "images"
_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(_IMAGES_DIR)), name="images")

@app.get("/")
async def root():
    """Root endpoint with API information."""
    logger.info("API root endpoint accessed")
    return {
        "message": "MathGenius API is running!",
        "version": "1.0.0",
        "environment": settings.environment,
        "modules": ["solve", "teach", "cbt", "exams", "tracking", "past_questions"],
        "docs": "/docs" if not settings.debug else None,
    }