import json
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration from environment variables."""

    # API
    app_name: str = "MathGenius"
    environment: str = os.getenv("ENVIRONMENT", "development")
    debug: bool = environment == "development"

    # CORS — override in production via ALLOWED_ORIGINS env var
    # (accepts a JSON array or a comma-separated string).
    # NOTE: kept as plain str on purpose — pydantic-settings JSON-decodes
    # env values for list fields *before* any validator runs, so a
    # comma-separated value would crash the app at startup.
    allowed_origins: str = ""

    @property
    def allowed_origin_list(self) -> list[str]:
        raw = (self.allowed_origins or "").strip()
        if not raw:
            return ["http://localhost:5173", "http://localhost:3000"]
        if raw.startswith("["):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed if str(o).strip()]
            except (ValueError, TypeError):
                pass
        return [o.strip() for o in raw.split(",") if o.strip()]

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
