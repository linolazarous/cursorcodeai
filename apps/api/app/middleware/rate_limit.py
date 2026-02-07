# apps/api/app/middleware/rate_limit.py
"""
Rate Limiting Middleware & Helpers – CursorCode AI
Production-grade global + per-route rate limiting using slowapi.
2026 standards: Redis backend, per-user/IP limiting, admin bypass, audit logging.
"""

import logging
from typing import Callable, Awaitable

from fastapi import FastAPI, Request, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.services.logging import audit_log

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────
# Global Limiter Configuration
# ────────────────────────────────────────────────
# Uses Redis backend for distributed limiting (critical in production)
limiter = Limiter(
    key_func=get_remote_address,                # default: per IP
    storage_uri=settings.REDIS_URL,
    default_limits=["100/minute"],              # global fallback
    retry_after_header=True,
    headers_enabled=True,
)

# ────────────────────────────────────────────────
# Custom key functions for more granular control
# ────────────────────────────────────────────────
def get_user_or_ip_key(request: Request) -> str:
    """
    Rate limit by authenticated user ID if present, otherwise by IP.
    Much fairer than pure IP limiting (prevents shared-IP abuse).
    """
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    return f"ip:{get_remote_address(request)}"


def get_admin_bypass_key(request: Request) -> str:
    """
    Completely bypass rate limiting for admin users (useful for debugging).
    """
    user = getattr(request.state, "current_user", None)
    if user and "admin" in getattr(user, "roles", []):
        return "admin_bypass"
    return get_user_or_ip_key(request)


# ────────────────────────────────────────────────
# Middleware to attach limiter to app and add user context
# ────────────────────────────────────────────────
class RateLimitMiddleware(SlowAPIMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        # Attach limiter to request state so endpoints can use it
        request.state.limiter = limiter

        # Try to attach current_user if auth middleware ran before
        # (depends on middleware order – auth should run first)
        user = getattr(request.state, "current_user", None)
        if user:
            request.state.user_id = user.id

        response = await call_next(request)
        return response


# ────────────────────────────────────────────────
# Exception handler for rate limit exceeded
# ────────────────────────────────────────────────
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    audit_log.delay(
        user_id=getattr(request.state, "user_id", None),
        action="rate_limit_exceeded",
        metadata={
            "path": request.url.path,
            "ip": get_remote_address(request),
            "limit": exc.detail,
        }
    )

    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please try again later.",
            "retry_after": exc.retry_after if hasattr(exc, "retry_after") else None
        },
        headers={"Retry-After": str(exc.retry_after) if hasattr(exc, "retry_after") else "60"}
    )


# ────────────────────────────────────────────────
# How to use in main.py
# ────────────────────────────────────────────────
"""
In apps/api/app/main.py:

# After creating app = FastAPI(...)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
app.add_middleware(RateLimitMiddleware)

# Example route-level limiting
@router.post("/some-action")
@limiter.limit("10/minute;user:{user_id}")   # uses get_user_or_ip_key
async def some_action(request: Request, ...):
    ...
"""

# ────────────────────────────────────────────────
# Example per-route limiting patterns
# ────────────────────────────────────────────────
"""
# High-security endpoints (login, 2FA, password reset)
@router.post("/auth/login")
@limiter.limit("5/minute;ip")               # strict IP limit
async def login(...): ...

# Credit-consuming actions
@router.post("/projects")
@limiter.limit("3/minute;user:{user_id}")   # per-user limit
async def create_project(...): ...

# Admin endpoints – bypass for admins
@router.get("/admin/stats")
@limiter.limit("30/minute;admin_bypass")    # uses get_admin_bypass_key
async def admin_stats(...): ...
"""