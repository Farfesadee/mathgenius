import time
import hashlib
import json
from functools import wraps
from typing import Callable, Any, Optional
from datetime import datetime, timedelta

# Simple in-memory cache (replace with Redis in production)
_CACHE = {}


class CacheEntry:
    """Simple cache entry with TTL."""

    def __init__(self, value: Any, ttl_seconds: int):
        self.value = value
        self.created_at = time.time()
        self.ttl_seconds = ttl_seconds

    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        return time.time() - self.created_at > self.ttl_seconds


def cache_key(*args, **kwargs) -> str:
    """Generate a cache key from function arguments."""
    key_data = json.dumps(
        {"args": args, "kwargs": kwargs},
        default=str,
        sort_keys=True,
    )
    return hashlib.md5(key_data.encode()).hexdigest()


def cached(ttl_seconds: int = 300, key_func: Optional[Callable] = None):
    """
    Decorator to cache function results.

    Args:
        ttl_seconds: Time to live for cache entry (default 5 minutes)
        key_func: Custom function to generate cache key from args
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if key_func:
                k = key_func(*args, **kwargs)
            else:
                k = f"{func.__name__}:{cache_key(*args, **kwargs)}"

            # Return cached value if available and not expired
            if k in _CACHE and not _CACHE[k].is_expired():
                return _CACHE[k].value

            # Call function and cache result
            result = await func(*args, **kwargs)
            _CACHE[k] = CacheEntry(result, ttl_seconds)

            # Clean up expired entries occasionally
            if len(_CACHE) % 100 == 0:
                _cleanup_expired()

            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if key_func:
                k = key_func(*args, **kwargs)
            else:
                k = f"{func.__name__}:{cache_key(*args, **kwargs)}"

            # Return cached value if available and not expired
            if k in _CACHE and not _CACHE[k].is_expired():
                return _CACHE[k].value

            # Call function and cache result
            result = func(*args, **kwargs)
            _CACHE[k] = CacheEntry(result, ttl_seconds)

            # Clean up expired entries occasionally
            if len(_CACHE) % 100 == 0:
                _cleanup_expired()

            return result

        # Return appropriate wrapper based on function type
        if hasattr(func, "__await__"):
            return async_wrapper
        return sync_wrapper

    return decorator


def clear_cache():
    """Clear all cached entries."""
    _CACHE.clear()


def _cleanup_expired():
    """Remove expired cache entries."""
    expired_keys = [k for k, v in _CACHE.items() if v.is_expired()]
    for k in expired_keys:
        del _CACHE[k]
