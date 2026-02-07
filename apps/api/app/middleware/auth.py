# apps/api/app/middleware/auth.py
"""
Authentication Middleware & Dependencies - CursorCode AI
JWT + RBAC + multi-tenant org context.
Production hardened (2026): secure cookies, token rotation, org scoping, audit.
"""

import logging
from datetime import datetime, timezone
from typing import Annotated, Optional, Dict

import jwt
from fastapi import (
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.services.logging import audit_log
from app.tasks.email import send_email_task

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)  # Optional Bearer, fallback to cookies


class AuthUser(BaseModel):
    """Current authenticated user context"""
    id: str
    email: str
    roles: list[str]
    org_id: str
    plan: str
    credits: int
    is_active: bool


async def get_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)] = None,
) -> AuthUser:
    """
    Dependency: Extracts and validates current user from JWT (cookie or Bearer).
    Injects org context and RBAC checks.
    """
    # 1. Try cookie first (preferred for browser), then Bearer (API clients)
    token = request.cookies.get("access_token")
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    # 2. Decode & validate JWT
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"],
            options={"require": ["exp", "sub", "type"], "verify_exp": True},
        )

        if payload.get("type") != "access":
            raise jwt.InvalidTokenError("Not an access token")

        user_id = payload["sub"]
        email = payload.get("email")
        roles = payload.get("roles", ["user"])
        org_id = payload.get("org_id")
        plan = payload.get("plan", "starter")
        credits = payload.get("credits", 0)

        if not user_id or not org_id:
            raise jwt.InvalidTokenError("Missing required claims")

    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except (jwt.InvalidTokenError, jwt.DecodeError) as e:
        logger.warning(f"Invalid JWT: {e}")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    # 3. Fetch user from DB (for up-to-date status, credits, etc.)
    user = await db.get(User, user_id)
    if not user or user.deleted_at:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account not found or deactivated")

    if not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email not verified")

    # 4. Org context validation
    if user.org_id != org_id:
        logger.warning(f"JWT org mismatch: JWT={org_id}, DB={user.org_id}")
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid organization context")

    # 5. Build context object
    auth_user = AuthUser(
        id=str(user.id),
        email=user.email,
        roles=roles,
        org_id=str(user.org_id),
        plan=user.plan,
        credits=user.credits,
        is_active=user.is_active,
    )

    # 6. Sentry context + audit
    sentry_sdk.set_user({"id": auth_user.id, "email": auth_user.email})
    sentry_sdk.set_tag("org_id", auth_user.org_id)

    # Optional: audit on every auth (high volume → sample)
    if settings.AUDIT_ALL_AUTH:
        audit_log.delay(user.id, "auth_access", {"path": request.url.path})

    return auth_user


async def require_role(
    required_role: str,
    user: Annotated[AuthUser, Depends(get_current_user)]
) -> AuthUser:
    """
    RBAC dependency: enforce role (e.g. "admin", "org_owner")
    """
    if required_role not in user.roles:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Insufficient permissions. Required role: {required_role}"
        )
    return user


async def require_org_owner(
    user: Annotated[AuthUser, Depends(get_current_user)]
) -> AuthUser:
    return await require_role("org_owner", user)


async def require_admin(
    user: Annotated[AuthUser, Depends(get_current_user)]
) -> AuthUser:
    return await require_role("admin", user)


# ────────────────────────────────────────────────
# Optional: Token Refresh in middleware (if expired access token)
# ────────────────────────────────────────────────
async def refresh_if_needed(request: Request, response: Response):
    """
    Middleware helper: auto-refresh access token if expired (optional usage)
    """
    access_token = request.cookies.get("access_token")
    if not access_token:
        return

    try:
        jwt.decode(access_token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        refresh_token = request.cookies.get("refresh_token")
        if not refresh_token:
            return

        try:
            payload = jwt.decode(refresh_token, settings.JWT_REFRESH_SECRET, algorithms=["HS256"])
            user_id = payload["sub"]

            new_access = create_access_token({"sub": user_id, "type": "access"})
            new_refresh = create_refresh_token({"sub": user_id})

            response.set_cookie("access_token", new_access, **settings.COOKIE_DEFAULTS)
            response.set_cookie("refresh_token", new_refresh, **settings.COOKIE_DEFAULTS)

            logger.info(f"Auto-refreshed token for user {user_id}")
        except Exception as e:
            logger.warning(f"Auto-refresh failed: {e}")
           