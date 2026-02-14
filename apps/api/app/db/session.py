"""
Database session management for CursorCode AI.

Production-grade:
• Supabase pooler compatible
• asyncpg correct SSL handling
• Stable connection pooling
• FastAPI dependency
• Startup health check
• Graceful shutdown
"""

import logging
import ssl
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from sqlalchemy import text

from app.core.config import settings


# ────────────────────────────────────────────────
# Logging
# ────────────────────────────────────────────────

logger = logging.getLogger("cursorcode.db")


# ────────────────────────────────────────────────
# Proper SSL Context for asyncpg
# ────────────────────────────────────────────────

ssl_context = ssl.create_default_context()

# Supabase pooler fix
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_REQUIRED


# ────────────────────────────────────────────────
# Engine
# ────────────────────────────────────────────────

DATABASE_URL = str(settings.DATABASE_URL)

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,

    echo=settings.ENVIRONMENT == "development",

    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,

    pool_pre_ping=True,

    connect_args={
        "ssl": ssl_context,
        "server_settings": {
            "application_name": "cursorcode-api"
        },
    },
)


# ────────────────────────────────────────────────
# Session Factory
# ────────────────────────────────────────────────

async_session_factory = async_sessionmaker(
    bind=engine,
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
# Startup Test
# ────────────────────────────────────────────────

async def init_db():

    logger.info("Testing database connection...")

    try:

        async with engine.connect() as conn:

            result = await conn.execute(text("SELECT 1"))

            logger.info(
                "Database connected successfully",
                extra={"result": result.scalar()}
            )

    except Exception:

        logger.critical(
            "Database connection failed",
            exc_info=True
        )


# ────────────────────────────────────────────────
# Lifespan
# ────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app):

    logger.info("Starting database")

    await init_db()

    yield

    logger.info("Closing database")

    await engine.dispose()


# ────────────────────────────────────────────────
# Utility
# ────────────────────────────────────────────────

def get_engine() -> AsyncEngine:

    return engine
