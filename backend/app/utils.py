import json
import logging
from typing import Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


def safe_json_encode(obj: Any) -> str:
    """Safely encode object to JSON, handling common non-serializable types."""
    return json.dumps(
        obj,
        default=lambda o: (
            o.isoformat() if isinstance(o, datetime) else
            str(o)
        ),
        indent=None,
    )


def truncate_string(text: str, max_length: int = 500) -> str:
    """Truncate string to max length with ellipsis."""
    if len(text) <= max_length:
        return text
    return text[:max_length - 3] + "..."


def format_error_response(
    error: str,
    detail: Optional[str] = None,
    request_id: Optional[str] = None,
) -> dict:
    """Format a standard error response."""
    return {
        "error": error,
        "detail": detail,
        "request_id": request_id,
    }


def format_success_response(data: Any) -> dict:
    """Format a standard success response."""
    return {
        "success": True,
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
    }


def sanitize_log_output(obj: Any, max_length: int = 1000) -> str:
    """Sanitize object for logging (truncate, encode safely)."""
    try:
        output = safe_json_encode(obj)
        return truncate_string(output, max_length)
    except Exception:
        return str(obj)[:max_length]
