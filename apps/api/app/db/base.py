# apps/api/app/db/base.py
"""
SQLAlchemy declarative base and metadata for CursorCode AI.
All models inherit from this Base class.

This file defines:
- Abstract base class (never mapped to a table)
- Optional automatic table name convention
- Common timestamp columns via mixin pattern
"""

from datetime import datetime
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    Abstract base class for all SQLAlchemy models in CursorCode AI.
    
    Features:
    - Does NOT create its own table (__abstract__ = True)
    - Optional automatic table name generation (lowercase class name + 's')
    - Common timestamp columns available via mixin (TimestampMixin)
    """

    __abstract__ = True  # ← CRITICAL: prevents Base from being mapped as a table

    # Optional: automatically generate table names like "user" → "users"
    # Comment out if you prefer explicit __tablename__ in every model
    @classmethod
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s"

    # Optional helper: get all column names (useful for migrations/audits)
    @classmethod
    def get_column_names(cls) -> list[str]:
        return [c.key for c in cls.__table__.columns]

    def __repr__(self) -> str:
        fields = ", ".join(
            f"{k}={v!r}" for k, v in self.__dict__.items() if not k.startswith("_")
        )
        return f"{self.__class__.__name__}({fields})"


# ────────────────────────────────────────────────
# Timestamp Mixin (use this instead of defining timestamps on Base)
# ────────────────────────────────────────────────
class TimestampMixin:
    """
    Mixin class that adds created_at and updated_at columns.
    Inherit from this in models that need automatic timestamps.

    Example:
        class User(Base, TimestampMixin):
            ...
    """

    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
        comment="Record creation timestamp"
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Record last update timestamp"
    )
