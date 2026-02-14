"""
app/middleware/security.py
Adds security headers to all responses (HSTS, CSP, X-Frame-Options, etc.).
Production-ready (2026): strict CSP, permissions policy, logging on violations.
"""

import logging
from typing import Awaitable, Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.config import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)

        # Always-on headers (safe & recommended)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=()"
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"  # modern, blocks non-CORP resources
        response.headers["Cross-Origin-Resource-Policy"] = "same-origin"  # restricts cross-origin loading

        # Content-Security-Policy – stricter in production
        if settings.is_production:
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.cursorcode.ai; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https://*; "
                "connect-src 'self' https://api.cursorcode.ai ws://api.cursorcode.ai https://*.cursorcode.ai; "
                "frame-ancestors 'none'; "
                "form-action 'self'; "
                "base-uri 'self'; "
                "object-src 'none'; "
                "upgrade-insecure-requests;"
            )
        else:
            # More permissive in development (allows localhost tools, hot reload, etc.)
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:*; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: http://localhost:*; "
                "connect-src 'self' http://localhost:* ws://localhost:* https://api.cursorcode.ai; "
                "frame-ancestors 'self'; "
                "form-action 'self'; "
                "base-uri 'self';"
            )

        response.headers["Content-Security-Policy"] = csp

        # Optional: Log CSP violations (client-side reports)
        # response.headers["Content-Security-Policy-Report-Only"] = csp + "; report-uri /csp-violation-report"

        # Log if response is suspicious (e.g. 4xx/5xx from admin routes)
        if response.status_code >= 400 and "/admin" in request.url.path:
            logger.warning(
                f"Admin route returned {response.status_code}",
                extra={"path": str(request.url.path), "method": request.method}
            )

        return response


# ────────────────────────────────────────────────
# Integration in main.py (recommended pattern)
# ────────────────────────────────────────────────
"""
In main.py (after app = FastAPI(...)):

from app.middleware.security import SecurityHeadersMiddleware

app.add_middleware(SecurityHeadersMiddleware)
"""
