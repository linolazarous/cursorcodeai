# app/tasks/metering.py
"""
Celery tasks for usage-based metering (reporting to Stripe Billing Meters).
Tracks Grok/xAI API token consumption and reports via stripe.billing.meter_events.create().
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from celery import shared_task
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.user import User
from app.core.config import settings
from app.services.logging import audit_log_sync
import stripe

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

# Meter configuration (match what you created in Stripe Dashboard/API)
METER_EVENT_NAME = "grok_tokens_used"          # Must match your meter's event_name
METER_AGGREGATION = "sum"                      # sum of tokens reported

@shared_task(
    name="app.tasks.metering.report_grok_usage",
    bind=True,
    max_retries=5,
    default_retry_delay=60,  # 1 minute
    retry_backoff=True,
    retry_jitter=True,
    acks_late=True,
)
def report_grok_usage(
    self,
    user_id: str,
    tokens_used: int,
    model_name: str,
    timestamp: Optional[int] = None,  # Unix timestamp; defaults to now
    request_id: Optional[str] = None,  # For idempotency / tracing
):
    """
    Report Grok/xAI API token usage to Stripe Billing Meter.
    
    - Called after each successful Grok API call (or batched periodically)
    - Uses stripe.billing.meter_events.create() (2025+ preferred method)
    - Idempotent via request_id or event properties
    - Adds audit trail and optional email alert on high usage
    """
    if tokens_used <= 0:
        logger.info("Zero tokens reported – skipping")
        return

    try:
        if timestamp is None:
            timestamp = int(datetime.now(timezone.utc).timestamp())

        async def _report():
            async with async_session_factory() as db:
                # Fetch user & validate subscription
                user = await db.scalar(
                    select(User).where(User.id == user_id)
                )
                if not user or not user.stripe_customer_id or user.subscription_status != "active":
                    logger.warning(f"Cannot report usage for user {user_id}: no active subscription")
                    return

                customer_id = user.stripe_customer_id
                subscription_id = user.stripe_subscription_id  # optional, for reference

                # Optional: Check for high usage alert threshold
                if tokens_used > 100_000:  # example threshold
                    # Queue email alert (non-blocking)
                    from app.services.email import send_email
                    send_email.delay(
                        to=user.email,
                        subject="High Grok API Usage Detected",
                        template="high_usage_alert.html",
                        context={
                            "tokens": tokens_used,
                            "model": model_name,
                            "date": datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d %H:%M UTC")
                        }
                    )

                # Report to Stripe Meter
                meter_event = stripe.billing.meter_events.create(
                    event_name=METER_EVENT_NAME,
                    value=tokens_used,
                    identifier=f"{user_id}_{request_id or timestamp}",  # Helps with deduplication
                    customer=customer_id,
                    event_timestamp=timestamp,
                    metadata={
                        "model": model_name,
                        "user_id": user_id,
                        "request_id": request_id or "unknown",
                        "subscription_id": subscription_id or "none",
                        "source": "grok_api_call"
                    }
                )

                logger.info(
                    f"Reported {tokens_used} tokens to Stripe meter for customer {customer_id} "
                    f"(event id: {meter_event.id})"
                )

                # Audit log
                audit_log_sync(
                    user_id=user_id,
                    action="grok_usage_reported",
                    metadata={
                        "tokens": tokens_used,
                        "model": model_name,
                        "stripe_event_id": meter_event.id,
                        "customer_id": customer_id
                    }
                )

        asyncio.run(_report())

    except stripe.error.StripeError as se:
        logger.error(f"Stripe API error reporting usage: {se}")
        sentry_sdk.capture_exception(se)  # Assuming Sentry is set up
        raise self.retry(exc=se, countdown=60 * (2 ** self.request.retries))  # exponential backoff

    except Exception as exc:
        logger.exception(f"Unexpected error reporting Grok usage for user {user_id}")
        sentry_sdk.capture_exception(exc)
        raise self.retry(exc=exc)


@shared_task(
    name="app.tasks.metering.batch_report_daily_usage",
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 min
)
def batch_report_daily_usage(self, user_id: str = None):
    """
    Optional daily/periodic batch task:
    Aggregate pending usage from Redis/DB and report in bulk.
    Useful for high-volume users to reduce API calls.
    """
    # Implementation sketch (expand as needed):
    # 1. Query Redis counters or DB UsageLog table for last 24h
    # 2. Sum tokens per model/customer
    # 3. Call report_grok_usage.delay() for each aggregated entry
    # Or batch-create multiple meter_events in one call if Stripe supports

    logger.info(f"Running daily batch usage report (user: {user_id or 'all'})")
    # ... logic here ...
    pass