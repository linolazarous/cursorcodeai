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
    ENVIRONMENT: str = Field(
        ...,
        pattern="^(development|staging|production)$",
        description="Runtime environment"
    )
    APP_VERSION: str = "1.0.0"
    LOG_LEVEL: str = Field("INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")

    # ────────────────────────────────────────────────
    # URLs & Domains
    # ────────────────────────────────────────────────
    FRONTEND_URL: AnyHttpUrl = Field(
        ...,
        description="Base URL of the frontend (used in emails, links, CORS, redirects)"
    )

    @property
    def API_URL(self) -> AnyHttpUrl:
        """Computed API base URL (derived from FRONTEND_URL)."""
        return AnyHttpUrl(f"{self.FRONTEND_URL.rstrip('/')}/api")

    # Optional – only if needed for legacy frontend links
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
    # Redis (Upstash or self-hosted)
    # ────────────────────────────────────────────────
    REDIS_URL: RedisDsn = Field(
        ...,
        description="Redis connection string (used for caching, rate limiting, sessions)"
    )

    # ────────────────────────────────────────────────
    # Stripe Billing
    # ────────────────────────────────────────────────
    STRIPE_SECRET_KEY: SecretStr
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: SecretStr

    # ────────────────────────────────────────────────
    # Resend Email
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
    DEFAULT_XAI_MODEL: str = Field("grok-beta", description="Default Grok model")
    FAST_REASONING_MODEL: str = Field("grok-beta-fast", description="Fast reasoning model")
    FAST_NON_REASONING_MODEL: str = Field("grok-beta-fast", description="Fast non-reasoning model")

    # ────────────────────────────────────────────────
    # JWT & Security
    # ────────────────────────────────────────────────
    JWT_SECRET_KEY: SecretStr
    JWT_REFRESH_SECRET: SecretStr
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(15, ge=1, le=1440)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(30, ge=1, le=90)

    COOKIE_SECURE: bool = Field(True, description="Set to False in development")
    COOKIE_DEFAULTS: Dict[str, Any] = Field(default_factory=lambda: {
        "httponly": True,
        "secure": True,  # overridden by COOKIE_SECURE in production
        "samesite": "strict",
        "path": "/",
    })

    # ────────────────────────────────────────────────
    # CORS
    # ────────────────────────────────────────────────
    CORS_ORIGINS: List[AnyHttpUrl] = Field(default_factory=list)

    @model_validator(mode='after')
    def compute_cors_origins(self) -> 'Settings':
        """Auto-populate CORS_ORIGINS from FRONTEND_URL if empty."""
        if not self.CORS_ORIGINS:
            self.CORS_ORIGINS = [self.FRONTEND_URL]
        return self

    # ────────────────────────────────────────────────
    # Validation & Computed Properties
    # ────────────────────────────────────────────────
    @field_validator("ENVIRONMENT", mode="before")
    @classmethod
    def validate_env(cls, v: str) -> str:
        v = v.lower().strip()
        if v not in ["development", "staging", "production"]:
            raise ValueError("Invalid ENVIRONMENT value")
        return v

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_dev(self) -> bool:
        return self.ENVIRONMENT == "development"

    def get_cookie_options(self, max_age: int = None) -> Dict[str, Any]:
        """Get secure cookie options, adjusted for environment."""
        opts = self.COOKIE_DEFAULTS.copy()
        opts["secure"] = self.COOKIE_SECURE and self.is_production
        if max_age is not None:
            opts["max_age"] = max_age
        return opts


# ────────────────────────────────────────────────
# Singleton instance (cached)
# ────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
