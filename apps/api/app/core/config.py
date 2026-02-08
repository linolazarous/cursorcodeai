# apps/api/app/core/config.py
"""
Central configuration & settings for CursorCode AI API
Loads from environment variables with strict validation (pydantic-settings v2+).
Production-ready (February 2026): type-safe, computed props, secrets handling.
Uses Resend for email sending (SendGrid migration complete).
"""

from functools import lru_cache
from typing import List, Dict, Any, Optional

from pydantic import (
    AnyHttpUrl,
    EmailStr,
    Field,
    HttpUrl,
    PostgresDsn,
    RedisDsn,
    SecretStr,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    """
    CursorCode AI API Settings
    All values loaded from environment variables (.env or platform secrets).
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
    FRONTEND_URL: AnyHttpUrl = Field(
        ...,
        description="Base URL of the frontend (used in emails, links, CORS, redirects)"
    )

    # Computed backend API URL (used internally & in emails)
    @property
    def API_URL(self) -> AnyHttpUrl:
        """Computed API base URL (derived from FRONTEND_URL or fallback)."""
        return AnyHttpUrl(f"{self.FRONTEND_URL}/api")

    # Optional – only if needed for legacy frontend links (rare in backend)
    NEXT_PUBLIC_APP_URL: Optional[AnyHttpUrl] = Field(
        default=None,
        description="Frontend base URL (frontend-only; optional in backend)"
    )

    # ────────────────────────────────────────────────
    # Database (Supabase PostgreSQL)
    # ────────────────────────────────────────────────
    DATABASE_URL: PostgresDsn = Field(
        ...,
        description="Supabase direct PostgreSQL connection string"
    )

    # ────────────────────────────────────────────────
    # Redis (Upstash recommended)
    # ────────────────────────────────────────────────
    REDIS_URL: RedisDsn = Field(
        ...,
        description="Upstash or Redis connection string"
    )

    # ────────────────────────────────────────────────
    # Stripe Billing
    # ────────────────────────────────────────────────
    STRIPE_SECRET_KEY: SecretStr
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: SecretStr

    # ────────────────────────────────────────────────
    # Resend Email (replaced SendGrid)
    # ────────────────────────────────────────────────
    RESEND_API_KEY: SecretStr = Field(
        ...,
        description="Resend API key for sending emails"
    )
    EMAIL_FROM: EmailStr = Field(
        "no-reply@cursorcode.ai",
        description="Default sender email (must be verified in Resend dashboard)"
    )

    # ────────────────────────────────────────────────
    # xAI / Grok API
    # ────────────────────────────────────────────────
    XAI_API_KEY: SecretStr
    DEFAULT_XAI_MODEL: str = "grok-4-latest"
    FAST_REASONING_MODEL: str = "grok-4-1-fast-reasoning"
    FAST_NON_REASONING_MODEL: str = "grok-4-1-fast-non-reasoning"

    # ────────────────────────────────────────────────
    # JWT & Security
    # ────────────────────────────────────────────────
    JWT_SECRET_KEY: SecretStr
    JWT_REFRESH_SECRET: SecretStr
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    COOKIE_SECURE: bool = True  # Set False in dev
    COOKIE_DEFAULTS: Dict[str, Any] = Field(default_factory=lambda: {
        "httponly": True,
        "secure": True,  # overridden by COOKIE_SECURE
        "samesite": "strict",
        "path": "/",
    })

    # ────────────────────────────────────────────────
    # CORS (frontend origins)
    # ────────────────────────────────────────────────
    CORS_ORIGINS: List[AnyHttpUrl] = Field(default_factory=list)

    @model_validator(mode='after')
    def compute_cors_origins(self) -> 'Settings':
        """Automatically populate CORS_ORIGINS from FRONTEND_URL if empty."""
        if not self.CORS_ORIGINS:
            self.CORS_ORIGINS = [self.FRONTEND_URL]
        return self

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
        opts = self.COOKIE_DEFAULTS.copy()
        opts["max_age"] = max_age
        opts["secure"] = self.COOKIE_SECURE
        return opts


# ────────────────────────────────────────────────
# Singleton instance (cached)
# ────────────────────────────────────────────────
@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
