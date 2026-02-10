# apps/api/app/db/plan.py
"""
SQLAlchemy model for subscription plans.
Defines available plans (starter, pro, ultra, etc.) with pricing and Stripe linkage.
"""

from __future__ import annotations

from enum import Enum as PyEnum

from sqlalchemy import String, Integer, Boolean, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class BillingInterval(str, PyEnum):
    """Allowed billing intervals."""
    MONTH = "month"
    YEAR = "year"


class Plan(Base):
    """
    Subscription plan definition.

    Each row represents one purchasable plan tier.
    Linked to Stripe Product & Price objects for checkout and webhooks.
    """

    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
        comment="Internal unique identifier (starter, pro, ultra, ...)",
    )
    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="User-facing name (e.g. 'Pro Plan', 'Ultra')",
    )
    price_usd_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="Price in USD cents (e.g. 1999 = $19.99)",
    )
    interval: Mapped[BillingInterval] = mapped_column(
        Enum(BillingInterval),
        default=BillingInterval.MONTH,
        nullable=False,
        comment="Billing cycle: month or year",
    )
    stripe_product_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
        comment="Stripe Product ID (created via dashboard or API)",
    )
    stripe_price_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
        comment="Stripe recurring Price ID for this plan",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether this plan is currently offered",
    )

    # Future extension fields (uncomment when needed)
    # credits_monthly: Mapped[int] = mapped_column(Integer, default=0)
    # features: Mapped[list[str]] = mapped_column(JSON, default_factory=list)
    # max_projects: Mapped[int] = mapped_column(Integer, default=999)

    # Relationships (if needed later)
    # users = relationship("User", back_populates="plan")

    def __repr__(self) -> str:
        return (
            f"<Plan id={self.id} name={self.name!r} "
            f"price=${self.price_usd_cents/100:.2f}/{self.interval}>"
        )
