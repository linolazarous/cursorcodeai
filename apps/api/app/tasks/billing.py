# app/tasks/billing.py
"""
Celery tasks for processing Stripe webhook events.
All tasks are idempotent where possible and include retries.
"""

import logging
from typing import Dict, Any
from datetime import datetime
from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory  # Your async session maker
from app.models.user import User
from app.core.config import settings
from app.services.logging import audit_log_sync  # Sync version if needed in tasks
from app.services.email import send_email  # Your SendGrid / email service

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# Helper: Get async DB session in Celery task
# ────────────────────────────────────────────────
async def get_db_session() -> AsyncSession:
    async with async_session_factory() as session:
        yield session


@shared_task(
    name="app.tasks.billing.handle_checkout_session_completed",
    bind=True,
    max_retries=5,
    default_retry_delay=30,          # seconds
    retry_backoff=True,
    retry_jitter=True,
    acks_late=True,
)
def handle_checkout_session_completed(self, session_data: Dict[str, Any]):
    """
    Process successful checkout session (new subscription created).
    Idempotent: safe to re-run.
    """
    try:
        customer_id = session_data["customer"]
        subscription_id = session_data["subscription"]
        plan_id = session_data.get("metadata", {}).get("plan", "standard")  # fallback

        async def _process():
            async with async_session_factory() as db:
                # Find user by Stripe customer ID
                stmt = select(User).where(User.stripe_customer_id == customer_id)
                result = await db.execute(stmt)
                user = result.scalar_one_or_none()

                if not user:
                    logger.warning(f"No user found for Stripe customer {customer_id}")
                    return

                # Update only if not already active (idempotency)
                if user.stripe_subscription_id == subscription_id and user.subscription_status == "active":
                    logger.info(f"Subscription {subscription_id} already processed for user {user.id}")
                    return

                # Apply plan credits & status
                user.stripe_subscription_id = subscription_id
                user.plan = plan_id
                user.credits += settings.STRIPE_PLAN_CREDITS.get(plan_id, 75)  # e.g. 75 for standard
                user.subscription_status = "active"
                user.updated_at = datetime.utcnow()

                await db.commit()
                await db.refresh(user)

                logger.info(f"Activated subscription {subscription_id} for user {user.id} – plan: {plan_id}")

                # Send welcome / confirmation email
                send_email(
                    to=user.email,
                    subject="Welcome to CursorCode AI – Subscription Active!",
                    template="subscription_welcome.html",
                    context={"plan": plan_id, "credits_added": settings.STRIPE_PLAN_CREDITS.get(plan_id, 75)}
                )

                # Audit
                audit_log_sync(
                    user_id=user.id,
                    action="subscription_activated",
                    metadata={"subscription_id": subscription_id, "plan": plan_id}
                )

        asyncio.run(_process())  # Run async code in sync Celery task

    except Exception as exc:
        logger.exception(f"Failed to process checkout.session.completed: {exc}")
        raise self.retry(exc=exc)


@shared_task(
    name="app.tasks.billing.handle_invoice_paid",
    bind=True,
    max_retries=5,
    default_retry_delay=30,
    retry_backoff=True,
    acks_late=True,
)
def handle_invoice_paid(self, invoice_data: Dict[str, Any]):
    """
    Monthly (or recurring) payment succeeded → reset/add credits.
    """
    try:
        customer_id = invoice_data["customer"]
        subscription_id = invoice_data["subscription"]
        amount_paid = invoice_data["amount_paid"] / 100  # cents → dollars

        async def _process():
            async with async_session_factory() as db:
                user = await db.scalar(
                    select(User).where(User.stripe_customer_id == customer_id)
                )
                if not user:
                    return

                # Only add credits if subscription matches
                if user.stripe_subscription_id != subscription_id:
                    logger.warning(f"Invoice paid for mismatched subscription {subscription_id}")
                    return

                # Add monthly credits (or pro-rated if needed)
                credits_to_add = settings.STRIPE_PLAN_CREDITS.get(user.plan, 75)
                user.credits += credits_to_add
                user.subscription_status = "active"
                user.updated_at = datetime.utcnow()

                await db.commit()

                logger.info(f"Invoice paid → added {credits_to_add} credits to user {user.id}")

                audit_log_sync(
                    user_id=user.id,
                    action="invoice_paid",
                    metadata={"amount": amount_paid, "subscription_id": subscription_id}
                )

        asyncio.run(_process())

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(
    name="app.tasks.billing.handle_invoice_payment_failed",
    bind=True,
    max_retries=3,
    default_retry_delay=60 * 5,  # 5 minutes
    retry_backoff=True,
)
def handle_invoice_payment_failed(self, invoice_data: Dict[str, Any]):
    """
    Payment failed → mark status, notify user (dunning flow)
    """
    try:
        customer_id = invoice_data["customer"]
        subscription_id = invoice_data["subscription"]
        attempt_count = invoice_data.get("attempt_count", 1)

        async def _process():
            async with async_session_factory() as db:
                user = await db.scalar(
                    select(User).where(User.stripe_customer_id == customer_id)
                )
                if not user:
                    return

                user.subscription_status = "past_due"
                await db.commit()

                # Send dunning email
                send_email(
                    to=user.email,
                    subject=f"Payment Failed – Action Required (Attempt {attempt_count})",
                    template="payment_failed.html",
                    context={
                        "attempt": attempt_count,
                        "update_payment_url": f"{settings.FRONTEND_URL}/billing/update-payment",
                        "days_until_cancel": 7  # example
                    }
                )

                logger.warning(f"Payment failed (attempt {attempt_count}) for user {user.id}")

                audit_log_sync(
                    user_id=user.id,
                    action="payment_failed",
                    metadata={"attempt": attempt_count, "subscription_id": subscription_id}
                )

        asyncio.run(_process())

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(
    name="app.tasks.billing.handle_subscription_updated",
    bind=True,
    max_retries=5,
    default_retry_delay=30,
)
def handle_subscription_updated(self, subscription_data: Dict[str, Any]):
    """
    Subscription status / plan changed (active → past_due → trialing → canceled, etc.)
    """
    try:
        customer_id = subscription_data["customer"]
        new_status = subscription_data["status"]
        subscription_id = subscription_data["id"]

        async def _process():
            async with async_session_factory() as db:
                user = await db.scalar(
                    select(User).where(User.stripe_customer_id == customer_id)
                )
                if not user or user.stripe_subscription_id != subscription_id:
                    return

                if user.subscription_status == new_status:
                    return  # idempotent

                user.subscription_status = new_status
                await db.commit()

                logger.info(f"Subscription {subscription_id} updated to {new_status} for user {user.id}")

                audit_log_sync(
                    user_id=user.id,
                    action="subscription_updated",
                    metadata={"new_status": new_status, "subscription_id": subscription_id}
                )

                # Optional: notify user on important changes
                if new_status in ["past_due", "canceled", "unpaid"]:
                    send_email(
                        to=user.email,
                        subject=f"Your CursorCode AI Subscription is {new_status.capitalize()}",
                        template="subscription_status_change.html",
                        context={"status": new_status}
                    )

        asyncio.run(_process())

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(
    name="app.tasks.billing.handle_subscription_deleted",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_subscription_deleted(self, subscription_data: Dict[str, Any]):
    """
    Subscription canceled / deleted → downgrade to free tier
    """
    try:
        customer_id = subscription_data["customer"]
        subscription_id = subscription_data["id"]

        async def _process():
            async with async_session_factory() as db:
                user = await db.scalar(
                    select(User).where(User.stripe_customer_id == customer_id)
                )
                if not user or user.stripe_subscription_id != subscription_id:
                    return

                user.plan = "starter"
                user.credits = settings.FREE_TIER_CREDITS  # e.g. 10
                user.stripe_subscription_id = None
                user.subscription_status = "canceled"
                await db.commit()

                logger.info(f"Subscription {subscription_id} deleted → downgraded user {user.id} to starter")

                send_email(
                    to=user.email,
                    subject="Your CursorCode AI Subscription Has Been Canceled",
                    template="subscription_canceled.html",
                    context={"credits_remaining": user.credits}
                )

                audit_log_sync(
                    user_id=user.id,
                    action="subscription_canceled",
                    metadata={"subscription_id": subscription_id}
                )

        asyncio.run(_process())

    except Exception as exc:
        raise self.retry(exc=exc)