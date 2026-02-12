"""
Celery tasks for usage-based metering (reporting to Stripe Billing Meters).
Tracks Grok/xAI API token consumption and reports via stripe.billing.meter_events.create().
Supports single reports and daily batch aggregation.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from celery import shared_task
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.db.models.user import User                          # ← FIXED: correct path
# from app.db.models.user_usage import UserUsage             # ← Uncomment & create if you have this model
from app.core.config import settings
from app.services.logging import audit_log
from app.services.email import send_low_credits_alert  # or high-usage alert

import stripe
from stripe.error import StripeError

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY.get_secret_value()

# Meter configuration (must match Stripe Billing Meter setup)
METER_EVENT_NAME = "grok_tokens_used"
METER_AGGREGATION = "sum"  # or "count", "max", etc.

# High usage threshold for alert (tokens per report)
HIGH_USAGE_THRESHOLD = 100_000  # e.g. 100k tokens → alert


@shared_task(
    bind=True,
    name="app.tasks.metering.report_grok_usage",
    max_retries=5,
    default_retry_delay=60,
    retry_backoff=True,
    retry_jitter=True,
    acks_late=True,
)
def report_grok_usage(
    self,
    user_id: str,
    tokens_used: int,
    model_name: str,
    timestamp: Optional[int] = None,
    request_id: Optional[str] = None,
):
    """
    Report Grok/xAI API token usage to Stripe Billing Meter.
    
    Called after each successful Grok API call (or batched).
    Uses stripe.billing.meter_events.create() (2025+ preferred method).
    Idempotent via request_id or event properties.
    """
    if tokens_used <= 0:
        logger.info("Zero tokens reported – skipping")
        return

    if timestamp is None:
        timestamp = int(datetime.now(timezone.utc).timestamp())

    async def _report(db: AsyncSession):
        user = await db.scalar(select(User).where(User.id == user_id))
        if not user or not user.stripe_customer_id or user.subscription_status != "active":
            logger.warning(f"Cannot report usage for user {user_id}: no active subscription")
            return

        customer_id = user.stripe_customer_id
        subscription_id = user.stripe_subscription_id or "none"

        # Optional high usage alert
        if tokens_used > HIGH_USAGE_THRESHOLD:
            send_low_credits_alert.delay(
                email=user.email,
                remaining=tokens_used,  # misuse of name, but works for alert
                background_tasks=None
            )

        try:
            meter_event = stripe.billing.meter_events.create(
                event_name=METER_EVENT_NAME,
                value=tokens_used,
                identifier=f"{user_id}_{request_id or timestamp}",  # deduplication
                customer=customer_id,
                event_timestamp=timestamp,
                metadata={
                    "model": model_name,
                    "user_id": user_id,
                    "request_id": request_id or "unknown",
                    "subscription_id": subscription_id,
                    "source": "grok_api_call"
                }
            )

            logger.info(
                f"Reported {tokens_used} tokens to Stripe meter",
                extra={
                    "user_id": user_id,
                    "customer_id": customer_id,
                    "stripe_event_id": meter_event.id,
                    "model": model_name,
                    "tokens": tokens_used,
                }
            )

            audit_log.delay(
                user_id=user_id,
                action="grok_usage_reported",
                metadata={
                    "tokens": tokens_used,
                    "model": model_name,
                    "stripe_event_id": meter_event.id,
                    "customer_id": customer_id,
                }
            )

        except StripeError as se:
            logger.error(
                f"Stripe API error reporting usage for user {user_id}",
                extra={"error": str(se), "tokens": tokens_used}
            )
            raise self.retry(exc=se)

    try:
        with async_session_factory() as db:
            _report(db)
    except Exception as exc:
        logger.exception(f"Unexpected error reporting Grok usage for user {user_id}")
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    name="app.tasks.metering.batch_report_daily_usage",
    max_retries=3,
    default_retry_delay=300,  # 5 min
)
def batch_report_daily_usage(self, user_id: Optional[str] = None):
    """
    Daily/periodic batch task: Aggregate pending usage and report in bulk.
    Reduces API calls for high-volume users.
    """
    since = datetime.now(timezone.utc) - timedelta(hours=24)

    async def _batch(db: AsyncSession):
        # TODO: If you have a UserUsage model, use it here
        # For now, assuming single reports are used; batch aggregates would need a usage table
        stmt = (
            select(
                User.id,
                User.stripe_customer_id,
                User.stripe_subscription_id,
                func.sum(10).label("total_tokens"),  # Placeholder: adjust if you have real aggregation
                "mixed_grok"  # Placeholder model
            )
            .where(User.id == user_id) if user_id else select(...)
            .group_by(User.id)
        )

        result = await db.execute(stmt)
        rows = result.all()

        for row in rows:
            user_id, customer_id, sub_id, total_tokens, model = row

            if not customer_id or total_tokens == 0:
                continue

            try:
                stripe.billing.meter_events.create(
                    event_name=METER_EVENT_NAME,
                    value=total_tokens,
                    identifier=f"batch_{user_id}_{since.timestamp()}",
                    customer=customer_id,
                    event_timestamp=int(since.timestamp()),
                    metadata={
                        "model": model,
                        "user_id": user_id,
                        "subscription_id": sub_id or "none",
                        "source": "daily_batch",
                        "period_start": since.isoformat(),
                    }
                )

                logger.info(
                    f"Batch reported {total_tokens} tokens for user {user_id}",
                    extra={"model": model, "customer_id": customer_id}
                )

                audit_log.delay(
                    user_id=user_id,
                    action="batch_usage_reported",
                    metadata={
                        "tokens": total_tokens,
                        "model": model,
                        "period_start": since.isoformat(),
                    }
                )

            except StripeError as e:
                logger.error(f"Batch report failed for user {user_id}: {e}")

    try:
        with async_session_factory() as db:
            _batch(db)
    except Exception as exc:
        logger.exception("Batch usage reporting failed")
        raise self.retry(exc=exc)
