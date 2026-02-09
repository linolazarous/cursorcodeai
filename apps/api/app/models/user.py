# apps/api/app/models/user.py
"""
SQLAlchemy Models - Users & Organizations
Core multi-tenant foundation for CursorCode AI (2026 production standards).
"""

from datetime import datetime
from typing import List, Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from enum import Enum as PyEnum

from app.db.base import Base


class UserRole(str, PyEnum):
    USER = "user"
    ADMIN = "admin"
    ORG_OWNER = "org_owner"


class Org(Base):
    """
    Organization / Tenant
    - Root of multi-tenancy
    - Billing, projects, and usage scoped per org
    - Can have multiple users (team accounts)
    """
    __tablename__ = "orgs"
    __table_args__ = (
        Index("ix_orgs_slug", "slug"),
        {'extend_existing': True},  # Safeguard against duplicate table registration
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)

    # Relationships
    users: Mapped[List["User"]] = relationship("User", back_populates="org", cascade="all, delete-orphan")
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="org", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Org(id={self.id}, name={self.name}, slug={self.slug})>"


class User(Base):
    """
    User Account (multi-tenant)
    - Belongs to exactly one Org
    - Has RBAC roles (scoped to org)
    - Full billing, 2FA, verification, reset support
    """
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_email_verified", "email", "is_verified"),
        Index("ix_users_stripe_customer_id", "stripe_customer_id"),
        Index("ix_users_org_id_role", "org_id", "roles"),
        Index("ix_users_deleted_at", "deleted_at"),
        {'extend_existing': True},
    )

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=func.gen_random_uuid(),
        index=True,
    )

    # Identity
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Null for OAuth-only

    # Verification
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    verification_expires: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Password Reset
    reset_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Hashed
    reset_expires: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # 2FA (TOTP)
    totp_secret: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    totp_backup_codes: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)  # Hashed

    # RBAC & Tenant
    roles: Mapped[List[str]] = mapped_column(JSON, default=list, server_default="['user']", nullable=False)
    org_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orgs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    org: Mapped["Org"] = relationship("Org", back_populates="users")

    # Stripe Billing
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True, index=True)
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    plan: Mapped[str] = mapped_column(String(50), default="starter", nullable=False)
    credits: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    subscription_status: Mapped[str] = mapped_column(String(50), default="inactive", nullable=False)

    # Audit & Lifecycle
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True, index=True)

    # Relationships
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, org_id={self.org_id}, plan={self.plan})>"

    @property
    def is_active(self) -> bool:
        return self.is_verified and self.deleted_at is None

    def check_password(self, password: str) -> bool:
        from argon2 import PasswordHasher
        return PasswordHasher().verify(self.hashed_password, password) if self.hashed_password else False

    def generate_totp_uri(self) -> Optional[str]:
        if not self.totp_secret:
            return None
        import pyotp
        return pyotp.totp.TOTP(self.totp_secret).provisioning_uri(
            name=self.email,
            issuer_name="CursorCode AI"
        )
