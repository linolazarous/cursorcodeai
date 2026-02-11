# apps/api/app/db/base.py
"""
SQLAlchemy declarative base for CursorCode AI.
All models inherit from this Base class.

This file is kept minimal:
- Defines the abstract Base (never mapped to a table)
- Provides safe __repr__ / __str__ helpers
- All reusable patterns (timestamps, UUID, soft-delete, audit, slug, etc.) are in db/models/mixins.py and utils.py

Do NOT add table-specific logic or mixins here — keep models clean and modular.
"""

from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Abstract base class for all SQLAlchemy models in CursorCode AI.

    Features:
    - __abstract__ = True → prevents Base from being mapped as a table
    - Common place for global conventions (schema, future extensions)
    - No automatic table name generation (define __tablename__ explicitly in each model)
    - Safe __repr__ / __str__ helpers for debugging/logs

    All concrete models should inherit from Base + mixins from db/models/mixins.py
    """

    __abstract__ = True

    # Optional global table args (uncomment when needed for all models)
    # __table_args__ = {
    #     "schema": "public",           # if using PostgreSQL schemas
    #     "extend_existing": True,      # avoid duplicate table errors
    # }

    def __repr__(self) -> str:
        """Safe, readable representation (avoids loading large relationships or lazy fields)."""
        fields = ", ".join(
            f"{k}={v!r}"
            for k, v in self.__dict__.items()
            if not k.startswith("_") and v is not None
        )
        return f"{self.__class__.__name__}({fields})"

    def __str__(self) -> str:
        """Human-readable string representation (useful in logs and debugging)."""
        return self.__repr__()
