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
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import async_session_factory
from app.models.audit import AuditLog

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# Audit Log Model (should be in models/audit.py)
# ────────────────────────────────────────────────
# class AuditLog(Base):
#     __tablename__ = "audit_logs"
#     id: Mapped[int] = mapped_column(Integer, primary_key=True)
#     user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
#     action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
#     metadata: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=True)
#     ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
#     user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
#     created_at: Mapped[datetime] = mapped_column(
#         DateTime(timezone=True), server_default=func.now(), nullable=False
#     )
#     __table_args__ = (Index("ix_audit_logs_user_action", "user_id", "action"),)


@shared_task(
    name="app.tasks.logging.audit_log",
    bind=True,
    max_retries=5,
    default_retry_delay=30,  # seconds
    retry_backoff=True,
    retry_jitter=True,
    acks_late=True,
)
def audit_log_task(
    self,
    user_id: Optional[str],
    action: str,
    metadata: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_id: Optional[str] = None,
):
    """
    Celery task: Async audit log entry.
    Retries on DB failure, ensures immutability.
    """
    try:
        async def _log():
            async with async_session_factory() as db:
                stmt = insert(AuditLog).values(
                    user_id=user_id,
                    action=action,
                    metadata=metadata or {},
                    ip_address=ip_address,
                    user_agent=user_agent,
                    request_id=request_id,
                    created_at=datetime.now(timezone.utc),
                )
                await db.execute(stmt)
                await db.commit()

                logger.info(
                    f"AUDIT: {action} | user={user_id} | meta={json.dumps(metadata or {}, default=str)}"
                )

        asyncio.run(_log())

    except Exception as exc:
        logger.exception(f"Audit log failed for action '{action}'")
        sentry_sdk.capture_exception(exc)  # Assuming Sentry is initialized
        raise self.retry(exc=exc)


# ────────────────────────────────────────────────
# Sync wrapper (for non-async contexts or middleware)
# ────────────────────────────────────────────────
def audit_log(
    user_id: Optional[str],
    action: str,
    metadata: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
):
    """
    Convenience sync caller (queues Celery task).
    Use in middleware/routes where async is not available.
    """
    ip = request.client.host if request else None
    ua = request.headers.get("user-agent") if request else None

    audit_log_task.delay(
        user_id=user_id,
        action=action,
        metadata=metadata,
        ip_address=ip,
        user_agent=ua,
        request_id=request.headers.get("X-Request-ID") if request else None,
    )


# ────────────────────────────────────────────────
# Example usage in routes/middleware
# ────────────────────────────────────────────────
# In auth.py login endpoint:
# audit_log(user.id, "login_success", {"method": "password+2fa"}, request=request)

# In middleware (after auth):
# audit_log(user.id, "api_access", {"path": request.url.path, "method": request.method})