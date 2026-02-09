# apps/api/app/services/logging.py
"""
Audit Logging Service - CursorCode AI
Immutable, async, retryable audit trail for compliance & security.
Logs all significant user actions (login, signup, 2FA, billing, project creation, etc.).
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from celery import shared_task
from fastapi import Request
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)


@shared_task(
    name="app.tasks.logging.audit_log",
    bind=True,
    max_retries=5,
    default_retry_delay=30,  # seconds
    retry_backoff=True,
    retry_jitter=True,
    acks_late=True,
)
async def audit_log_task(
    self,
    user_id: Optional[str],
    action: str,
    metadata: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_id: Optional[str] = None,
):
    """
    Celery async task: Create audit log entry.
    Retries on DB failure, ensures immutability.
    """
    try:
        async with async_session_factory() as db:
            stmt = insert(AuditLog).values(
                user_id=user_id,
                action=action,
                event_metadata=metadata or {},  # renamed field
                ip_address=ip_address,
                user_agent=user_agent,
                request_id=request_id,
                created_at=datetime.now(timezone.utc),
            )
            await db.execute(stmt)
            await db.commit()

        logger.info(
            f"AUDIT: {action} | user={user_id} | "
            f"meta={json.dumps(metadata or {}, default=str)}"
        )

    except Exception as exc:
        logger.exception(f"Audit log failed for action '{action}'")
        raise self.retry(exc=exc)


# ────────────────────────────────────────────────
# Sync wrapper (for middleware/routes - queues Celery task)
# ────────────────────────────────────────────────
def audit_log(
    user_id: Optional[str],
    action: str,
    metadata: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
):
    """
    Convenience sync caller: queues the Celery audit task.
    Use in middleware or sync routes.
    """
    ip = request.client.host if request else None
    ua = request.headers.get("user-agent") if request else None
    req_id = request.headers.get("X-Request-ID") if request else None

    audit_log_task.delay(
        user_id=user_id,
        action=action,
        metadata=metadata,
        ip_address=ip,
        user_agent=ua,
        request_id=req_id,
    )


# ────────────────────────────────────────────────
# Example usage in routes/middleware
# ────────────────────────────────────────────────
# In auth.py login endpoint:
# audit_log(user.id, "login_success", {"method": "password+2fa"}, request=request)

# In middleware (after auth):
# audit_log(user.id, "api_access", {"path": request.url.path, "method": request.method})
