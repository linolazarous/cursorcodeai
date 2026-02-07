# apps/api/app/db/models.py
"""
Central location for all SQLAlchemy model imports.
Use this file to import models throughout the app.
"""

from .base import Base  # declarative base class

# Import all models here (order matters for relationships)
from .user import User, Org, UserRole
from .project import Project, ProjectStatus
from .audit import AuditLog

# Optional: expose commonly used types/enums
__all__ = [
    "Base",
    "User",
    "Org",
    "UserRole",
    "Project",
    "ProjectStatus",
    "AuditLog",
]