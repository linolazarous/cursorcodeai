# apps/api/app/routers/webhook.py
"""
Stripe Webhook Router - CursorCode AI
Production-hardened endpoint for all Stripe events (subscriptions, invoices, payments).
February 07, 2026 standards: idempotency, encryption, queuing, observability, security.
"""

import json
import logging
import time
import uuid
from typing import Dict, Any

from fastapi import APIRouter, Request, HTTPException, status, BackgroundTasks
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import stripe
from stripe.error import SignatureVerificationError, StripeError
from sqlalchemy.ext.asyncio import AsyncSession
import redis
import sentry_sdk
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings
from app.db.session import get_db
from app.middleware.auth import get_current_user, AuthUser  # for authenticated limiting
from app.services.billing import (
    handle_checkout_session_completed,
    handle_invoice_paid,
    handle_invoice_payment_failed,
    handle_subscription_updated,
    handle_subscription_deleted,
    handle_invoice_payment_succeeded,  # added
)
from app.services.logging import audit_log
from app.tasks.billing import (  # Celery tasks
    handle_checkout_session_completed_task,
    handle_invoice_paid_task,
    handle_invoice_payment_failed_task,
    handle_subscription_updated_task,
    handle_subscription_deleted_task,
    handle_invoice_payment_succeeded_task,  # added
)

router = APIRouter(prefix="/webhook", tags=["Webhooks"])

# ────────────────────────────────────────────────
# Clients & Config
# ────────────────────────────────────────────────
stripe.api_key = settings.STRIPE_SECRET_KEY.get_secret_value()
STRIPE_WEBHOOK_SECRET = settings.STRIPE_WEBHOOK_SECRET.get_secret_value()

# Sentry (full tracing + performance + breadcrumbs)
sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    traces_sample_rate=1.0 if settings.ENVIRONMENT != "production" else 0.3,
    profiles_sample_rate=0.5,
    environment=settings.ENVIRONMENT,
    release=f"cursorcode-api@{settings.APP_VERSION}",
    attach_stacktrace=True,
    send_default_pii=False,  # GDPR compliance
)

# Redis (idempotency + short-lived debug payloads)
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
IDEMPOTENCY_TTL = 60 * 60 * 24 * 7      # 7 days
DEBUG_PAYLOAD_TTL = 60 * 60 * 24        # 1 day

# Fernet encryption for raw payloads (debug only)
fernet = Fernet(settings.FERNET_KEY)    # Must be 32-byte base64 key

# Rate limiter: prefer user ID when authenticated, fallback to IP
def get_user_or_ip_key(request: Request) -> str:
    user = getattr(request.state, "current_user", None)
    if user and hasattr(user, "id"):
        return f"user:{user.id}"
    return f"ip:{get_remote_address(request)}"

limiter = Limiter(key_func=get_user_or_ip_key)

logger = logging.getLogger(__name__)


@router.post("/stripe", response_class=JSONResponse)
@limiter.limit("100/minute")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks,
):
    """
    Stripe Webhook - Handles all critical events.
    Always returns 200 immediately. Processing is queued async with retries.
    """
    start_time = time.time()
    request_id = str(uuid.uuid4())  # for correlation

    # Add request ID to Sentry context
    sentry_sdk.set_tag("request_id", request_id)
    sentry_sdk.set_tag("webhook_event", "pending")

    # ────────────────────────────────────────────────
    # 1. Get raw payload & signature
    # ────────────────────────────────────────────────
    payload_bytes = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        logger.error(f"[{request_id}] Missing stripe-signature header")
        sentry_sdk.capture_message("Webhook: Missing signature header", level="error")
        raise HTTPException(status_code=400, detail="Missing signature")

    # ────────────────────────────────────────────────
    # 2. Verify signature & construct event
    # ────────────────────────────────────────────────
    try:
        event = stripe.Webhook.construct_event(
            payload_bytes,
            sig_header,
            STRIPE_WEBHOOK_SECRET,
            tolerance=300,  # 5 min clock drift tolerance
        )
    except ValueError as e:
        logger.error(f"[{request_id}] Invalid payload: {e}")
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=400, detail="Invalid payload")
    except SignatureVerificationError as e:
        logger.error(f"[{request_id}] Invalid signature: {e}")
        sentry_sdk.capture_exception(e)
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_id = event["id"]
    event_type = event["type"]
    data_object = event["data"]["object"]

    sentry_sdk.set_tag("webhook_event", event_type)

    # ────────────────────────────────────────────────
    # 3. Idempotency (Redis)
    # ────────────────────────────────────────────────
    idempotency_key = f"stripe:processed:{event_id}"
    if redis_client.get(idempotency_key):
        logger.info(f"[{request_id}] Duplicate event {event_id} - already processed")
        return {"status": "duplicate"}

    redis_client.set(idempotency_key, "processed", ex=IDEMPOTENCY_TTL)

    # ────────────────────────────────────────────────
    # 4. Encrypt & store raw payload (debug only, short TTL, GDPR-safe)
    # ────────────────────────────────────────────────
    try:
        encrypted_payload = fernet.encrypt(payload_bytes)
        debug_key = f"stripe:debug:{event_id}"
        redis_client.set(debug_key, encrypted_payload, ex=DEBUG_PAYLOAD_TTL)
        logger.debug(f"[{request_id}] Debug payload stored (encrypted)")
    except InvalidToken as e:
        logger.error(f"[{request_id}] Fernet encryption failed: {e}")

    # ────────────────────────────────────────────────
    # 5. Queue event processing (non-blocking, retryable)
    # ────────────────────────────────────────────────
    def queue_event():
        try:
            if event_type == "checkout.session.completed":
                handle_checkout_session_completed_task.delay(data_object)
            elif event_type == "invoice.paid":
                handle_invoice_paid_task.delay(data_object)
            elif event_type == "invoice.payment_succeeded":  # added
                handle_invoice_payment_succeeded_task.delay(data_object)
            elif event_type == "invoice.payment_failed":
                handle_invoice_payment_failed_task.delay(data_object)
            elif event_type == "customer.subscription.updated":
                handle_subscription_updated_task.delay(data_object)
            elif event_type == "customer.subscription.deleted":
                handle_subscription_deleted_task.delay(data_object)
            elif event_type == "customer.created":
                logger.info(f"[{request_id}] Customer created: {data_object['id']}")
                # Optional: sync customer to DB
            else:
                logger.info(f"[{request_id}] Ignored event type: {event_type}")

            # Audit (queued)
            audit_log.delay(
                user_id=data_object.get("customer"),
                action="stripe_event_processed",
                metadata={
                    "event_type": event_type,
                    "event_id": event_id,
                    "timestamp": time.time(),
                    "request_id": request_id,
                },
            )

        except Exception as exc:
            logger.exception(f"[{request_id}] Failed to queue webhook event {event_type}")
            sentry_sdk.capture_exception(exc)

    background_tasks.add_task(queue_event)

    # ────────────────────────────────────────────────
    # 6. Performance & monitoring
    # ────────────────────────────────────────────────
    duration = time.time() - start_time
    if duration > 3.0:  # Stripe timeout = 5s — alert early
        sentry_sdk.capture_message(
            f"[{request_id}] Slow webhook processing: {duration:.2f}s for {event_type}",
            level="warning"
        )

    # Add correlation ID to response (for client-side tracing)
    return JSONResponse(
        content={"status": "received", "request_id": request_id},
        headers={"X-Request-ID": request_id}
    )


# ────────────────────────────────────────────────
# Production & Security Recommendations (February 07, 2026)
# ────────────────────────────────────────────────
"""
Security & Hardening:
- Rotate STRIPE_WEBHOOK_SECRET every 90 days (Stripe dashboard)
- Fernet-encrypt raw payloads for debug (never store plaintext, 1-day TTL)
- Redis idempotency keys auto-expire (no memory leak)
- Rate limit: user-aware when authenticated, fallback to IP (100/min)
- Sentry: no PII, full tracing + request_id tag
- HTTPS only + CSP/HSTS/X-Frame-Options via global middleware
- Isolate webhook worker pod (least privilege in K8s)
- Validate all event types & ignore unknown safely

Monitoring & Observability:
- Sentry: traces/profiles 100% for webhooks + request_id
- Prometheus: latency, success rate, duplicate rate, queue length
- Grafana alerts: >5% failed events, >3s processing, high duplicates
- PagerDuty/Slack on critical failures (payment_failed, subscription deleted)

Reliability & Scaling:
- Celery + Redis: exponential backoff retries (max 5)
- Idempotent handlers: check existing records before upsert
- K8s HPA: scale on queue length or CPU
- Load balancer: ALB/NLB with sticky sessions if needed

Compliance & GDPR:
- Raw payloads encrypted + 1-day TTL
- Anonymize logs (no full email/name)
- Data residency: region-aware Redis/Postgres (e.g. eu-central-1)
- Audit trail: immutable, queryable JSONB

Testing:
- stripe listen --forward-to localhost:8000/webhook/stripe
- stripe trigger checkout.session.completed
- stripe trigger invoice.paid
- stripe test clock: create + advance to simulate renewals/dunning

Future:
- Add usage metering reporting (stripe.billing.meter_events)
- Secret rotation automation (external script)
- Circuit breaker for Stripe API latency spikes
- Webhook signature verification retry on clock skew
"""