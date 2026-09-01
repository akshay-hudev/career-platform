import json
from pydantic_settings import BaseSettings
from functools import lru_cache

# Placeholders that must NEVER be used in production. The startup check below
# fails fast if SECRET_KEY is still one of these while DEBUG is False.
_INSECURE_SECRET_KEYS = {
    "change-this-in-production",
    "change-this-to-a-random-string-in-production",
    "secret",
    "",
}


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres:password@localhost:5432/careerdb"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Gemini
    GEMINI_API_KEY: str = ""
    # Model is configurable so a retired model can be swapped without a code change.
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Adzuna Job Search API (free tier)
    ADZUNA_APP_ID: str = ""
    ADZUNA_APP_KEY: str = ""

    # App
    SECRET_KEY: str = "change-this-in-production"
    DEBUG: bool = True
    # Comma-separated list of allowed origins, OR a JSON list. "*" is rejected
    # in production below.
    CORS_ORIGINS: list = ["*"]

    class Config:
        env_file = ".env"

    def parse_cors_origins(self) -> list[str]:
        """Read CORS_ORIGINS from a JSON list or comma-separated string."""
        raw = self.CORS_ORIGINS
        if isinstance(raw, str):
            raw = raw.strip()
            if not raw:
                return []
            if raw.startswith("["):
                try:
                    return [o.strip() for o in json.loads(raw) if o.strip()]
                except json.JSONDecodeError:
                    pass
            return [o.strip() for o in raw.split(",") if o.strip()]
        return [str(o).strip() for o in raw if str(o).strip()]


@lru_cache()
def get_settings():
    return Settings()


settings = get_settings()


def assert_production_safe() -> None:
    """Refuse to start in production with an insecure SECRET_KEY or wildcard CORS."""
    if settings.DEBUG:
        return
    if settings.SECRET_KEY in _INSECURE_SECRET_KEYS:
        raise RuntimeError(
            "SECRET_KEY is unset or still the placeholder. "
            "Set a strong SECRET_KEY in the environment before deploying."
        )
    origins = settings.parse_cors_origins()
    if not origins or "*" in origins:
        raise RuntimeError(
            "CORS_ORIGINS must be an explicit list of frontend origins in production "
            "(no '*'). Example: CORS_ORIGINS=https://your-app.vercel.app"
        )
