"""
Shared enums for CursorCode AI
All string-based enums used across the app (Plan, ProjectStatus, etc.)
"""

from enum import Enum


class Plan(str, Enum):
    """Subscription plans"""
    STARTER = "starter"
    STANDARD = "standard"
    PRO = "pro"
    PREMIER = "premier"
    ULTRA = "ultra"


class ProjectStatus(str, Enum):
    """Project lifecycle states"""
    PENDING = "pending"
    BUILDING = "building"
    COMPLETED = "completed"
    FAILED = "failed"
    DELETED = "deleted"
