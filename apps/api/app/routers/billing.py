# apps/api/app/routers/billing.py
"""
Billing Router - CursorCode AI
Handles Stripe checkout, subscription management, credit usage, and billing portal.
All endpoints require authentication.
"""

import logging
from typing import Annotated, Dict, Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Request,
    BackgroundTasks,
)
from sqlalchemy.ext.asyncio import AsyncSession

import stripe
from stripe.error import StripeError

from app.core.config import settings
from app.db.session import get_db
from app.middleware.auth import get_current_user, AuthUser
from app.models.user import User
from app.services.billing import (
    create_or_get_stripe_customer,
    create_checkout_session,
    report_usage,
)
from app.services.logging import audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing"])

stripe.api_key = settings.STRIPE_SECRET_KEY.get_secret_value()


# ────────────────────────────────────────────────
# Create Checkout Session (subscribe / upgrade plan)
# ────────────────────────────────────────────────
@router.post("/create-checkout-session")
async def create_billing_session(
    plan: str = "pro",  # starter, standard, pro, premier, ultra
    success_url: str = f"{settings.FRONTEND_URL}/billing/success",
    cancel_url: str = f"{settings.FRONTEND_URL}/billing",
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Generate Stripe Checkout session for subscription.
    Returns session URL to redirect user to.
    """
    if plan not in ["standard", "pro", "premier", "ultra"]:
        raise HTTPException(400, "Invalid plan selected")

    try:
        user = await db.get(User, current_user.id)
        if not user:
            raise HTTPException(404, "User not found")

        session = await create_checkout_session(
            user=user,
            plan=plan,
            success_url=success_url,
            cancel_url=cancel_url,
            db=db,
        )

        audit_log.delay(
            user_id=current_user.id,
            action="billing_checkout_created",
            metadata={"plan": plan, "session_id": session["session_id"]}
        )

        return session

    except StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(400, str(e.user_message) if hasattr(e, "user_message") else "Payment service error")
    except Exception as e:
        logger.exception("Checkout session creation failed")
        raise HTTPException(500, "Internal error")


# ────────────────────────────────────────────────
# Customer Portal (manage subscriptions, payment methods)
# ────────────────────────────────────────────────
@router.post("/portal")
async def create_billing_portal(
    return_url: str = f"{settings.FRONTEND_URL}/billing",
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Create Stripe Customer Portal session (manage billing, invoices, etc.).
    """
    try:
        user = await db.get(User, current_user.id)
        if not user or not user.stripe_customer_id:
            raise HTTPException(400, "No Stripe customer found")

        session = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=return_url,
        )

        audit_log.delay(
            user_id=current_user.id,
            action="billing_portal_opened",
            metadata={"session_id": session.id}
        )

        return {"url": session.url}

    except StripeError as e:
        logger.error(f"Stripe portal error: {e}")
        raise HTTPException(400, "Billing portal unavailable")
    except Exception as e:
        logger.exception("Portal session creation failed")
        raise HTTPException(500, "Internal error")


# ────────────────────────────────────────────────
# Get current plan & credits (for dashboard)
# ────────────────────────────────────────────────
@router.get("/status")
async def get_billing_status(
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Returns user's current plan, credits, subscription status.
    """
    user = await db.get(User, current_user.id)
    if not user:
        raise HTTPException(404, "User not found")

    return {
        "plan": user.plan,
        "credits": user.credits,
        "subscription_status": user.subscription_status,
        "stripe_customer_id": user.stripe_customer_id,
        "stripe_subscription_id": user.stripe_subscription_id,
    }


# ────────────────────────────────────────────────
# Report Grok usage (called from orchestrator after agent run)
# ────────────────────────────────────────────────
@router.post("/usage/report")
async def report_grok_usage_endpoint(
    tokens_used: int = Body(..., embed=True),
    model: str = Body(..., embed=True),
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Reports Grok token usage to Stripe (metered billing).
    Called internally by orchestration.
    """
    try:
        await report_usage(
            user_id=current_user.id,
            tokens=tokens_used,
            model=model,
            db=db,
        )

        audit_log.delay(
            user_id=current_user.id,
            action="grok_usage_reported",
            metadata={"tokens": tokens_used, "model": model}
        )

        return {"status": "reported", "tokens": tokens_used}

    except Exception as e:
        logger.exception("Failed to report usage")
        raise HTTPException(500, "Usage reporting failed")


# ────────────────────────────────────────────────
# Webhook confirmation test endpoint (for debugging)
# ────────────────────────────────────────────────
@router.get("/webhook/test")
async def test_webhook_connection(
    current_user: Annotated[AuthUser, Depends(require_admin)],
):
    """
    Simple endpoint to verify webhook URL is reachable from Stripe.
    """
    return {"status": "webhook endpoint reachable", "user": current_user.email}