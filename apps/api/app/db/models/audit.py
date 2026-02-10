# apps/api/app/db/models/audit.py
"""
AuditLog model for CursorCode AI
Immutable audit trail for compliance, security, and debugging.
Records all significant actions (auth, billing, admin ops, project events, etc.).
"""

from datetime import datetime
from typing import Dict, Optional
from uuid import uuid4

from sqlalchemy import (
    String,
    Text,
    JSONB,  # ← Use JSONB for faster queries/indexing
    ForeignKey,
    Index,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
    """
    Audit Log Entry
    - Immutable record of user/system actions
    - Captures who, what, when, where, how
    - Supports filtering by user, action, time, IP
    - JSONB metadata for flexible context
    """

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_user_id_action", "user_id", "action"),
        Index("ix_audit_created_at", "created_at"),
        Index("ix_audit_ip_address", "ip_address"),
        Index("ix_audit_deleted_at", "deleted_at"),
        {'extend_existing': True},
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
        index=True,
    )

    # Who performed the action (null = system/anonymous)
    user_id: Mapped[Optional[str]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="ID of the user (or null for system events)"
    )

    # What happened
    action: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Action identifier (e.g. 'login_success', 'project_created', 'subscription_activated')"
    )

    # Flexible context (JSONB for efficient querying)
    event_metadata: Mapped[Dict] = mapped_column(
        JSONB,
        nullable=False,
        server_default="{}",
        comment="Structured metadata (e.g. {'ip': '...', 'plan': 'pro', 'tokens': 5000})"
    )

    # Request context
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
        index=True,
        comment="Client IP (IPv4 or IPv6)"
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="User-Agent header"
    )
    request_path: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="API endpoint/path that triggered the action"
    )
    request_method: Mapped[Optional[str]] = mapped_column(
        String(10),
        nullable=True,
        comment="HTTP method (GET, POST, etc.)"
    )
    request_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        nullable=True,
        index=True,
        comment="Correlation ID (X-Request-ID) for tracing"
    )

    # Timestamps & Soft Delete
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="When the action occurred (UTC)"
    )
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Last update timestamp (rarely used)"
    )
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
        index=True,
        comment="Soft-delete timestamp (null = active)"
    )

    def __repr__(self) -> str:
        fields = [f"id={self.id}", f"action={self.action!r}"]
        if self.user_id:
            fields.append(f"user_id={self.user_id}")
        fields.append(f"created_at={self.created_at}")
        return f"<AuditLog({' '.join(fields)})>"

    @property
    def is_active(self) -> bool:
        """Check if the audit entry is not soft-deleted."""
        return self.deleted_at is None

    def soft_delete(self) -> None:
        """Mark entry as deleted (soft delete) — rare use case."""
        if self.deleted_at is None:
            self.deleted_at = datetime.now(timezone.utc)
