"""
Billing Router - CursorCode AI
Handles Stripe checkout, subscription management, credit usage, and billing portal.
All endpoints require authentication.
"""

import logging
from datetime import datetime
from typing import Annotated, Dict, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Request,
    Body,
)
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter

import stripe
from stripe.error import StripeError, InvalidRequestError

from app.core.config import settings
from app.core.enums import Plan  # ← NEW: import shared enum
from app.db.session import get_db
from app.middleware.auth import get_current_user, AuthUser
from app.db.models.user import User
from app.services.billing import (
    create_or_get_stripe_customer,
    create_checkout_session,
    report_usage,
)
from app.services.logging import audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])

security = HTTPBearer(auto_error=False)

# Rate limiter: per authenticated user
def billing_limiter_key(request: Request) -> str:
    user = getattr(request.state, "user", None)
    if user and hasattr(user, "id"):
        return str(user.id)
    return request.client.host  # fallback

limiter = Limiter(key_func=billing_limiter_key)

stripe.api_key = settings.STRIPE_SECRET_KEY.get_secret_value()


# ────────────────────────────────────────────────
# Models (using shared enums)
# ────────────────────────────────────────────────
class CreateCheckoutSessionRequest(BaseModel):
    plan: Plan = Field(...)  # ← Now uses shared Plan enum
    success_url: str = Field(default_factory=lambda: f"{settings.FRONTEND_URL}/billing/success")
    cancel_url: str = Field(default_factory=lambda: f"{settings.FRONTEND_URL}/billing")


class BillingPortalRequest(BaseModel):
    return_url: str = Field(default_factory=lambda: f"{settings.FRONTEND_URL}/billing")


class UsageReportRequest(BaseModel):
    tokens_used: int = Field(..., ge=0)
    model: str = Field(..., min_length=1)


class BillingStatusResponse(BaseModel):
    plan: str
    credits: int
    subscription_status: Optional[str]
    stripe_customer_id: Optional[str]
    stripe_subscription_id: Optional[str]


# The rest of the file remains exactly the same as your previous version
# (create_billing_session, create_billing_portal, get_billing_status, report_grok_usage_endpoint, test_webhook_connection)
# Just make sure parameter order is correct (request/payload/current_user before db)
