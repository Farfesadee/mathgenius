import time
import logging
from functools import wraps
from typing import Callable, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Performance metric for a function call."""

    name: str
    duration_ms: float
    success: bool
    error: Optional[str] = None


# Store metrics for later analysis
_METRICS = []


def measure_performance(threshold_ms: int = 1000):
    """
    Decorator to measure and log function performance.

    Args:
        threshold_ms: Log warning if function takes longer than this
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000

                if duration_ms > threshold_ms:
                    logger.warning(
                        f"{func.__name__} took {duration_ms:.1f}ms (threshold: {threshold_ms}ms)"
                    )

                _METRICS.append(PerformanceMetric(func.__name__, duration_ms, True))
                return result

            except Exception as exc:
                duration_ms = (time.time() - start_time) * 1000
                logger.error(
                    f"{func.__name__} failed after {duration_ms:.1f}ms: {exc}",
                    exc_info=True,
                )
                _METRICS.append(PerformanceMetric(func.__name__, duration_ms, False, str(exc)))
                raise

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000

                if duration_ms > threshold_ms:
                    logger.warning(
                        f"{func.__name__} took {duration_ms:.1f}ms (threshold: {threshold_ms}ms)"
                    )

                _METRICS.append(PerformanceMetric(func.__name__, duration_ms, True))
                return result

            except Exception as exc:
                duration_ms = (time.time() - start_time) * 1000
                logger.error(
                    f"{func.__name__} failed after {duration_ms:.1f}ms: {exc}",
                    exc_info=True,
                )
                _METRICS.append(PerformanceMetric(func.__name__, duration_ms, False, str(exc)))
                raise

        # Return appropriate wrapper based on function type
        if hasattr(func, "__await__"):
            return async_wrapper
        return sync_wrapper

    return decorator


def get_metrics(function_name: Optional[str] = None) -> list[PerformanceMetric]:
    """Get performance metrics."""
    if function_name:
        return [m for m in _METRICS if m.name == function_name]
    return _METRICS


def clear_metrics():
    """Clear all metrics."""
    _METRICS.clear()


def get_metrics_summary() -> dict:
    """Get summary statistics of metrics."""
    if not _METRICS:
        return {}

    by_name = {}
    for metric in _METRICS:
        if metric.name not in by_name:
            by_name[metric.name] = []
        by_name[metric.name].append(metric)

    summary = {}
    for name, metrics in by_name.items():
        durations = [m.duration_ms for m in metrics]
        successes = sum(1 for m in metrics if m.success)

        summary[name] = {
            "count": len(metrics),
            "success_count": successes,
            "error_count": len(metrics) - successes,
            "avg_duration_ms": sum(durations) / len(durations),
            "min_duration_ms": min(durations),
            "max_duration_ms": max(durations),
            "success_rate": successes / len(metrics),
        }

    return summary
