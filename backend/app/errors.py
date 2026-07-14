from fastapi import HTTPException, status
from typing import Optional, Any
import uuid
import logging

logger = logging.getLogger(__name__)


class APIException(HTTPException):
    """Base API exception with standard error format."""

    def __init__(
        self,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error: str = "Internal Server Error",
        detail: Optional[str] = None,
        request_id: Optional[str] = None,
    ):
        self.status_code = status_code
        self.error = error
        self.detail = detail
        self.request_id = request_id or str(uuid.uuid4())

        content = {
            "error": error,
            "detail": detail,
            "request_id": self.request_id,
        }

        super().__init__(status_code=status_code, detail=content)

        logger.warning(
            f"API Exception: {error}",
            extra={
                "status_code": status_code,
                "detail": detail,
                "request_id": self.request_id,
            },
        )


class ValidationError(APIException):
    """Raised for validation failures."""

    def __init__(self, detail: str, request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            error="Validation Error",
            detail=detail,
            request_id=request_id,
        )


class AuthenticationError(APIException):
    """Raised for authentication failures."""

    def __init__(self, detail: str = "Authentication failed", request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error="Authentication Error",
            detail=detail,
            request_id=request_id,
        )


class AuthorizationError(APIException):
    """Raised for authorization failures."""

    def __init__(self, detail: str = "Access denied", request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error="Authorization Error",
            detail=detail,
            request_id=request_id,
        )


class NotFoundError(APIException):
    """Raised when resource is not found."""

    def __init__(self, resource: str, request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error="Not Found",
            detail=f"{resource} not found",
            request_id=request_id,
        )


class RateLimitError(APIException):
    """Raised when rate limit is exceeded."""

    def __init__(self, detail: str = "Rate limit exceeded", request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error="Rate Limit Exceeded",
            detail=detail,
            request_id=request_id,
        )


class ExternalServiceError(APIException):
    """Raised when external service fails."""

    def __init__(self, service: str, detail: str = "", request_id: Optional[str] = None):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            error=f"{service} Service Error",
            detail=detail or f"Failed to communicate with {service}",
            request_id=request_id,
        )
