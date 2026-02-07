# apps/api/app/core/config.py
"""
Central configuration & settings for CursorCode AI API
Loads from environment variables with strict validation (pydantic-settings v2+).
Production-ready (February 2026): type-safe, computed props, secrets handling.
"""

from functools import lru_cache
from typing import List, Dict, Any, Optional

from pydantic import (
    AnyHttpUrl,
    BaseModel,
    EmailStr,
    Field,
    HttpUrl,
    PostgresDsn,
    RedisDsn,
    SecretStr,
    field_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    CursorCode AI API Settings
    All values loaded from environment variables (.env or Kubernetes secrets).
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore unknown env vars
    )

    # ────────────────────────────────────────────────
    # Core App
    # ────────────────────────────────────────────────
    ENVIRONMENT: str = Field(..., pattern="^(development|staging|production)$")
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: str = "INFO"

    # ────────────────────────────────────────────────
    # URLs & Domains
    # ────────────────────────────────────────────────
    NEXT_PUBLIC_APP_URL: AnyHttpUrl = Field(..., alias="NEXT_PUBLIC_APP_URL")
    FRONTEND_URL: AnyHttpUrl = Field(default_factory=lambda: "https://cursorcode.ai")
    API_URL: AnyHttpUrl = Field(default_factory=lambda s: f"{s.NEXT_PUBLIC_APP_URL}/api")

    # ────────────────────────────────────────────────
    # Database
    # ────────────────────────────────────────────────
    DATABASE_URL: PostgresDsn = Field(..., description="PostgreSQL connection string")

    # ────────────────────────────────────────────────
    # Redis (caching, Celery, rate limiting, sessions)
    # ────────────────────────────────────────────────
    REDIS_URL: RedisDsn = Field(..., description="Redis connection string")

    # ────────────────────────────────────────────────
    # Stripe Billing
    # ────────────────────────────────────────────────
    STRIPE_SECRET_KEY: SecretStr
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: SecretStr
    STRIPE_STANDARD_PRICE_ID: str
    STRIPE_PRO_PRICE_ID: str
    STRIPE_PREMIER_PRICE_ID: str
    STRIPE_ULTRA_PRICE_ID: str

    # Plan credits mapping
    STRIPE_PLAN_CREDITS: Dict[str, int] = Field(
        default_factory=lambda: {
            "starter": 10,
            "standard": 75,
            "pro": 150,
            "premier": 600,
            "ultra": 2000,
        }
    )

    # ────────────────────────────────────────────────
    # xAI / Grok API
    # ────────────────────────────────────────────────
    XAI_API_KEY: SecretStr
    DEFAULT_XAI_MODEL: str = "grok-4-latest"
    FAST_REASONING_MODEL: str = "grok-4-1-fast-reasoning"
    FAST_NON_REASONING_MODEL: str = "grok-4-1-fast-non-reasoning"

    # ────────────────────────────────────────────────
    # SendGrid Email
    # ────────────────────────────────────────────────
    SENDGRID_API_KEY: SecretStr
    EMAIL_FROM: EmailStr = "info@cursorcode.ai"
    SENDGRID_VERIFY_TEMPLATE_ID: str = Field(..., description="SendGrid dynamic template ID")
    SENDGRID_RESET_TEMPLATE_ID: str = Field(..., description="Password reset template")
    SENDGRID_2FA_ENABLED_TEMPLATE_ID: str = Field(..., description="2FA enabled template")
    SENDGRID_2FA_DISABLED_TEMPLATE_ID: str = Field(..., description="2FA disabled template")

    # ────────────────────────────────────────────────
    # JWT & Security
    # ────────────────────────────────────────────────
    JWT_SECRET_KEY: SecretStr
    JWT_REFRESH_SECRET: SecretStr
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    COOKIE_SECURE: bool = True  # Set False in dev
    COOKIE_DEFAULTS: Dict[str, Any] = Field(default_factory=lambda s: {
        "httponly": True,
        "secure": s.COOKIE_SECURE,
        "samesite": "strict",
        "path": "/",
    })

    # ────────────────────────────────────────────────
    # Observability
    # ────────────────────────────────────────────────
    SENTRY_DSN: Optional[HttpUrl] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.2
    AUDIT_ALL_AUTH: bool = False  # High volume → sample only in prod

    # ────────────────────────────────────────────────
    # CORS (frontend origins)
    # ────────────────────────────────────────────────
    CORS_ORIGINS: List[AnyHttpUrl] = Field(default_factory=lambda s: [s.FRONTEND_URL])

    # ────────────────────────────────────────────────
    # Computed / Helpers
    # ────────────────────────────────────────────────
    @field_validator("ENVIRONMENT", mode="before")
    @classmethod
    def validate_env(cls, v: str) -> str:
        v = v.lower()
        if v not in ["development", "staging", "production"]:
            raise ValueError("Invalid ENVIRONMENT")
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_dev(self) -> bool:
        return self.ENVIRONMENT == "development"

    def get_cookie_options(self, max_age: int) -> Dict[str, Any]:
        return {**self.COOKIE_DEFAULTS, "max_age": max_age}

# ────────────────────────────────────────────────
# Singleton instance (cached)
# ────────────────────────────────────────────────
@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()