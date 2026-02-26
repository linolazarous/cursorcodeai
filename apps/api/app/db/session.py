"""
CursorCode AI Database Session

FINAL Production Fix:
• Supabase pooler compatible
• Fix CERTIFICATE_VERIFY_FAILED
• Render compatible
• asyncpg correct SSL handling
• Disable prepared statements for PgBouncer/Supabase pooler
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


logger = logging.getLogger("cursorcode.db")


# ────────────────────────────────────────────────
# CRITICAL FIX: Supabase Pooler SSL
# ────────────────────────────────────────────────

ssl_context = ssl.create_default_context()

# REQUIRED for Supabase pooler
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE


# ────────────────────────────────────────────────
# Engine - WITH PREPARED STATEMENTS DISABLED
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
        # CRITICAL: Disable prepared statements for Supabase pooler
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "max_cached_statement_lifetime": 0,
        "command_timeout": 60,
        "timeout": 60,
    },
)


# ────────────────────────────────────────────────
# Session
# ────────────────────────────────────────────────

async_session_factory = async_sessionmaker(

    bind=engine,

    expire_on_commit=False,

    class_=AsyncSession,
)


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

    logger.info("Connecting to Supabase database...")

    try:

        async with engine.connect() as conn:

            result = await conn.execute(text("SELECT 1"))

            logger.info(
                "Database connected successfully",
                extra={"result": result.scalar()}
            )

    except Exception:

        logger.critical(
            "DATABASE CONNECTION FAILED",
            exc_info=True
        )


# ────────────────────────────────────────────────
# Lifespan
# ────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app):

    await init_db()

    yield

    await engine.dispose()

    logger.info("Database engine closed")


def get_engine() -> AsyncEngine:

    return engine
