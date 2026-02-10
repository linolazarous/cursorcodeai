# app/db/models/utils.py
"""
Utility functions and helpers for SQLAlchemy models in CursorCode AI.
Contains slug generation, validation, and other common model operations.
"""

import re
import unicodedata
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings


def generate_slug(text: str, max_length: int = 100) -> str:
    """
    Generate URL-safe slug from text (e.g. project title → slug).
    Removes accents, special chars, collapses spaces to hyphens.
    """
    # Normalize unicode → ASCII
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    # Lowercase, replace non-alphanum with hyphen
    text = re.sub(r"[^a-z0-9]+", "-", text.lower())
    # Strip leading/trailing hyphens
    text = text.strip("-")
    # Truncate
    text = text[:max_length]
    return text


async def is_slug_unique(
    slug: str,
    model_class,
    exclude_id: Optional[str] = None,
    db: AsyncSession
) -> bool:
    """
    Check if a slug is unique in the given model table.
    Optionally exclude a record (for updates).
    """
    stmt = select(model_class).where(model_class.slug == slug)
    if exclude_id:
        stmt = stmt.where(model_class.id != exclude_id)

    result = await db.execute(stmt)
    return result.scalar_one_or_none() is None


async def generate_unique_slug(
    text: str,
    model_class,
    exclude_id: Optional[str] = None,
    db: AsyncSession,
    max_attempts: int = 10,
    suffix_length: int = 6
) -> str:
    """
    Generate a unique slug based on text.
    Appends short random suffix if collision occurs.
    """
    base_slug = generate_slug(text)

    if await is_slug_unique(base_slug, model_class, exclude_id, db):
        return base_slug

    import secrets
    for _ in range(max_attempts):
        suffix = secrets.token_hex(suffix_length)[:suffix_length]
        candidate = f"{base_slug}-{suffix}"
        if await is_slug_unique(candidate, model_class, exclude_id, db):
            return candidate

    raise ValueError(f"Could not generate unique slug for '{text}' after {max_attempts} attempts")
