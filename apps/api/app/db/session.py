"""
Database session management for CursorCode AI.
Async SQLAlchemy engine, session factory, and FastAPI dependency.
Production-ready: connection pooling, transaction handling, async support.
Supabase-ready: uses pooled connection (recommended for Render/Fly/Railway).
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import text

from app.core.config import settings

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# Global Async Engine (singleton – created once)
# ────────────────────────────────────────────────
engine: AsyncEngine = create_async_engine(
    str(settings.DATABASE_URL),
    echo=settings.ENVIRONMENT == "development",
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=600,
    connect_args={
        "ssl": True if "supabase" in str(settings.DATABASE_URL).lower() else None,
    },
)

# Async Session Factory
async_session_factory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


# ────────────────────────────────────────────────
# FastAPI Dependency
# ────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ────────────────────────────────────────────────
# Startup: Test connection (non-fatal if fails)
# ────────────────────────────────────────────────
async def init_db():
    """
    Run on app startup – verifies connection to PostgreSQL/Supabase.
    Logs detailed error but does NOT crash app (allows partial startup).
    """
    db_url = str(settings.DATABASE_URL)
    logger.info("Attempting DB connection test", extra={"url": db_url})

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            await conn.commit()
            logger.info(
                "Database connection verified",
                extra={
                    "url": db_url,
                    "first_result": result.scalar(),
                }
            )
    except Exception as e:
        logger.critical(
            "Database connection failed on startup",
            exc_info=True,
            extra={
                "url": db_url,
                "error_type": type(e).__name__,
                "error_message": str(e),
            }
        )
        # Do NOT raise here – allow app to start (DB routes will 500)
        # raise RuntimeError("Database unavailable") from e   # ← commented out

    # Optional: Redis check (non-fatal)
    if hasattr(settings, "REDIS_URL") and settings.REDIS_URL:
        try:
            from redis.asyncio import Redis
            redis = Redis.from_url(str(settings.REDIS_URL))
            await redis.ping()
            await redis.aclose()
            logger.info("Redis connection verified", extra={"redis_url": str(settings.REDIS_URL)})
        except Exception as redis_exc:
            logger.warning("Redis ping failed (continuing without Redis)", exc_info=redis_exc)


# ────────────────────────────────────────────────
# Lifespan (use in main.py)
# ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app):
    await init_db()  # Test DB on startup (non-fatal)
    yield
    await engine.dispose()
    logger.info("Database engine disposed on shutdown")


# Utility for migrations/CLI
def get_engine() -> AsyncEngine:
    return engine
