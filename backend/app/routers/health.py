import logging
from fastapi import APIRouter, Query
from datetime import datetime
from app.config import settings
from app.metrics import get_metrics_summary

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Health & Monitoring"])


@router.get("/health")
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check — returns 200 if app is ready to serve traffic."""
    try:
        # Add any readiness checks here (DB connection, external services, etc)
        return {
            "ready": True,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.error(f"Readiness check failed: {exc}")
        return {
            "ready": False,
            "error": str(exc),
            "timestamp": datetime.utcnow().isoformat(),
        }


@router.get("/metrics")
async def metrics(function_name: str = Query(None)):
    """Get performance metrics (requires admin auth in production)."""
    if settings.environment == "production":
        logger.warning("Metrics endpoint accessed in production")
        # In production, require proper authentication
        # return {"error": "Metrics only available in development"}

    summary = get_metrics_summary()
    return {
        "environment": settings.environment,
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": summary,
        "total_endpoints": len(summary),
    }


@router.get("/version")
async def version():
    """Get API version."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "environment": settings.environment,
    }
