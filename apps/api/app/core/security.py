"""
Shared JWT utilities for token creation and validation.
No dependencies on other app modules — pure helpers.
"""

from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


def create_access_token(data: dict) -> str:
    """
    Create a short-lived access token (JWT).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")


def create_refresh_token(data: dict) -> str:
    """
    Create a long-lived refresh token (JWT).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_REFRESH_SECRET, algorithm="HS256")
