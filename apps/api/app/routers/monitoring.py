# apps/api/app/routers/monitoring.py
"""
Monitoring Router - CursorCode AI
Endpoints for logging and observability.
- Receives frontend errors from Next.js
- Exposes Prometheus metrics (handled in main.py)
Production-ready (February 2026): structured logging, Supabase error storage, no external vendors.
"""

import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, status, Depends
from sqlalchemy import insert

from app.core.config import settings
from app.db.session import get_db
from app.middleware.auth import get_current_user, AuthUser
from app.services.logging import audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.post("/log-error", status_code=status.HTTP_200_OK)
async def log_frontend_error(
    data: Dict[str, Any],
    request: Request,
    current_user: Annotated[Optional[AuthUser], Depends(get_current_user)] = None,
    db = Depends(get_db),
):
    """
    Receives frontend JavaScript/runtime errors from Next.js.
    - Logs structured error with context
    - Stores in Supabase 'app_errors' table (same as backend exceptions)
    - Audits the event
    """
    message = data.get("message", "Unknown frontend error")
    url = data.get("url")
    component = data.get("component")
    stack = data.get("stack")
    user_agent = data.get("userAgent")

    user_id = current_user.id if current_user else None
    ip = request.client.host

    # Structured logging (matches main.py style)
    logger.error(
        f"Frontend error: {message}",
        extra={
            "url": url,
            "component": component,
            "stack": stack,
            "user_agent": user_agent,
            "user_id": user_id,
            "ip": ip,
            "environment": settings.ENVIRONMENT,
            "request_path": request.url.path,
            "request_method": request.method,
        }
    )

    # Store in Supabase 'app_errors' table (consistent with main.py exception handler)
    try:
        await db.execute(
            insert("app_errors").values(
                level="frontend_error",
                message=message,
                stack=stack,
                user_id=user_id,
                request_path=url or request.url.path,
                request_method="GET",  # Frontend errors are usually client-side GET/POST
                environment=settings.ENVIRONMENT,
                extra={
                    "component": component,
                    "user_agent": user_agent,
                    "ip": ip,
                    "payload": data,
                },
            )
        )
        await db.commit()
    except Exception as db_exc:
        logger.error(f"Failed to store frontend error in Supabase: {db_exc}")

    # Audit log (matches main.py style)
    audit_log.delay(
        user_id=user_id,
        action="frontend_error_logged",
        metadata={
            "message": message,
            "url": url,
            "component": component,
            "user_agent": user_agent,
            "ip": ip,
        }
    )

    return {"status": "logged"}
