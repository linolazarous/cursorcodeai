# apps/api/app/db/session.py
"""
Database session management for CursorCode AI.
Async SQLAlchemy engine, session factory, and FastAPI dependency.
Production-ready: connection pooling, transaction handling, async support.
"""

import logging
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# SQLAlchemy Async Engine
# ────────────────────────────────────────────────
engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",  # SQL logging in dev only
    future=True,
    pool_pre_ping=True,                         # detect broken connections
    pool_size=20,                               # max connections
    max_overflow=10,                            # extra connections if pool full
    pool_timeout=30,                            # wait time for connection
    pool_recycle=3600,                          # recycle after 1 hour
)

# ────────────────────────────────────────────────
# Async Session Factory
# ────────────────────────────────────────────────
async_session_factory = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


# ────────────────────────────────────────────────
# FastAPI Dependency: per-request async session
# ────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency: provides a new async session per request.
    Automatically commits/rolls back and closes the session.
    """
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
# Utility: get engine (for migrations, CLI tools, tests)
# ────────────────────────────────────────────────
def get_engine() -> AsyncEngine:
    return engine


# ────────────────────────────────────────────────
# Optional: init function (call on startup if needed)
# ────────────────────────────────────────────────
async def init_db():
    """Run on app startup – test connection, optional migrations, etc."""
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        logger.info("Database connection successful")
    except Exception as e:
        logger.critical("Database connection failed on startup", exc_info=True)
        raise


# ────────────────────────────────────────────────
# Usage in main.py (lifespan or startup event)
# ────────────────────────────────────────────────
"""
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await engine.dispose()
"""