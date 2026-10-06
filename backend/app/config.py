import json
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration from environment variables."""

    # API
    app_name: str = "MathGenius"
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = environment == "development"

    # CORS — override in production via ALLOWED_ORIGINS env var
    # (accepts JSON array or comma-separated string).
    allowed_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return ["http://localhost:5173", "http://localhost:3000"]
            if v.startswith("["):
                return json.loads(v)
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # Groq
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_timeout: float = 30.0
    groq_max_retries: int = 3

    # Supabase
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_service_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")

    # Rate limiting
    rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
