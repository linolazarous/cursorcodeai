# apps/api/app/db/session.py
"""
Database session management for CursorCode AI.
Async SQLAlchemy engine, session factory, and FastAPI dependency.
Production-ready: connection pooling, transaction handling, async support.
Supabase-ready: uses pooled connection (recommended for Render/Fly/Railway).
"""

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# SQLAlchemy Async Engine (Supabase pooled connection)
# ────────────────────────────────────────────────
engine: AsyncEngine = create_async_engine(
    str(settings.DATABASE_URL),                      # str() ensures plain string (Pydantic PostgresDsn → str)
    echo=settings.ENVIRONMENT == "development",      # SQL logging only in dev
    future=True,
    pool_pre_ping=True,                              # Very important for Supabase pooling — detects broken/stale connections
    pool_size=10,                                    # Reasonable for pooled (Supabase free tier limit ~15-20)
    max_overflow=5,                                  # Allow some extra connections during spikes
    pool_timeout=30,                                 # Wait time to get connection from pool
    pool_recycle=600,                                # Recycle connections every 10 min (helps with Supabase idle timeouts)
    connect_args={"ssl": True} if "supabase" in str(settings.DATABASE_URL).lower() else {},  # Force SSL for Supabase
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
# Init function (call on startup – only tests connection)
# ────────────────────────────────────────────────
async def init_db():
    """Run on app startup – test connection to Supabase Postgres (pooled)."""
    try:
        async with engine.connect() as conn:
            await conn.execute("SELECT 1")
        
        db_type = "Supabase (pooled)" if "pooler" in str(settings.DATABASE_URL).lower() else "PostgreSQL"
        logger.info(f"{db_type} connection verified successfully")
    except Exception as e:
        logger.critical("Database connection failed on startup", exc_info=True)
        raise


# ────────────────────────────────────────────────
# Usage in main.py (lifespan)
# ────────────────────────────────────────────────
"""
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()           # only tests connection
    yield
    # No engine.dispose() needed with Supabase external pooling
    logger.info("Shutdown complete")
"""
