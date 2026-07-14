import os
from supabase import create_client, Client
from app.config import settings
from app.logging_config import get_logger

logger = get_logger(__name__)


class Database:
    """Singleton database client for Supabase."""

    _instance: Client = None

    @classmethod
    def get_instance(cls) -> Client:
        """Get or create database instance."""
        if cls._instance is None:
            if not settings.supabase_url or not settings.supabase_service_key:
                logger.error("Supabase credentials not configured")
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")

            cls._instance = create_client(
                settings.supabase_url,
                settings.supabase_service_key,
            )
            logger.info("Database connection established")

        return cls._instance

    @classmethod
    def close(cls):
        """Close database connection."""
        if cls._instance:
            logger.info("Database connection closed")
            cls._instance = None


def get_db() -> Client:
    """Dependency injection for database client."""
    return Database.get_instance()


# Database schema version for migrations
SCHEMA_VERSION = "1.0.0"

# Expected tables (for validation)
REQUIRED_TABLES = [
    "auth.users",
    "public.profiles",
    "public.exam_questions",
    "public.theory_questions",
    "public.user_attempts",
    "public.study_sessions",
    "public.bookmarks",
    "public.teach_sessions",
]
