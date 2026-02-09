# apps/api/app/routers/projects.py
"""
Projects Router - CursorCode AI
CRUD operations for AI-generated projects.
Includes credit checks, orchestration trigger, multi-tenant scoping, audit logging.
"""

import logging
from datetime import datetime
from typing import List, Annotated, Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    BackgroundTasks,
    Query,
    Request,  # Required for slowapi rate limiting
)
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter

from app.core.config import settings
from app.db.session import get_db
from app.middleware.auth import get_current_user, AuthUser
from app.models.project import Project, ProjectStatus
from app.models.user import User
from app.services.billing import deduct_credits
from app.services.email import send_deployment_success_email
from app.services.logging import audit_log
from app.ai.orchestrator import run_agent_graph_task  # Celery task

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects", tags=["Projects"])

security = HTTPBearer(auto_error=False)

limiter = Limiter(key_func=lambda r: r.client.host)


class ProjectCreate(BaseModel):
    prompt: str = Field(..., min_length=10, description="Natural language description of the app to build")
    title: Optional[str] = Field(None, max_length=255)


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    status: Optional[ProjectStatus] = None


class ProjectOut(BaseModel):
    id: UUID
    title: Optional[str]
    prompt: str
    status: ProjectStatus
    deploy_url: Optional[str]
    preview_url: Optional[str]
    code_repo_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post(
    "/",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create new AI-generated project",
    responses={
        201: {"description": "Project created and orchestration started"},
        402: {"description": "Insufficient credits"},
        429: {"description": "Rate limit exceeded"},
    }
)
@limiter.limit("5/minute")
async def create_project(
    request: Request,
    payload: ProjectCreate,
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new project from prompt.
    Deducts credits → triggers agent orchestration → sends email on success/failure.
    """
    # Credit check & atomic deduction
    success, msg = await deduct_credits(
        user_id=current_user.id,
        amount=10,  # Fixed cost per project start (adjust per plan)
        reason=f"Project creation: {payload.prompt[:50]}...",
        db=db,
    )
    if not success:
        raise HTTPException(status.HTTP_402_PAYMENT_REQUIRED, msg)

    project = Project(
        prompt=payload.prompt,
        title=payload.title or f"Project {UUID().hex[:8]}",
        status=ProjectStatus.PENDING,
        user_id=UUID(current_user.id),
        org_id=UUID(current_user.org_id),
    )

    db.add(project)
    await db.commit()
    await db.refresh(project)

    # Trigger AI agent orchestration (async via Celery)
    run_agent_graph_task.delay(
        project_id=str(project.id),
        prompt=payload.prompt,
        user_id=current_user.id,
        org_id=current_user.org_id,
    )

    audit_log.delay(
        user_id=current_user.id,
        action="project_created",
        metadata={
            "project_id": str(project.id),
            "title": project.title,
            "prompt_length": len(payload.prompt),
            "credits_deducted": 10,
        },
        request=request,
    )

    background_tasks.add_task(
        send_email_task.delay,
        to=current_user.email,
        subject="New Project Started - CursorCode AI",
        html=f"""
        <h2>New Project Created!</h2>
        <p>Your project "{project.title}" has been started.</p>
        <p>We'll notify you when it's ready.</p>
        <p><a href="{settings.FRONTEND_URL}/projects/{project.id}">View in dashboard</a></p>
        """,
    )

    return project


@router.get(
    "/",
    response_model=List[ProjectOut],
    summary="List user's projects (paginated)",
)
async def list_projects(
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ProjectStatus] = None,
):
    """
    List projects scoped to the current user/org.
    """
    stmt = (
        select(Project)
        .where(Project.user_id == UUID(current_user.id))
        .order_by(Project.created_at.desc())
        .offset(offset)
        .limit(limit)
    )

    if status:
        stmt = stmt.where(Project.status == status)

    result = await db.execute(stmt)
    projects = result.scalars().all()

    return projects


@router.get(
    "/{project_id}",
    response_model=ProjectOut,
    summary="Get single project details",
)
async def get_project(
    project_id: UUID,
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve a specific project (must belong to user/org).
    """
    project = await db.get(Project, project_id)
    if not project or project.user_id != UUID(current_user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    return project


@router.patch(
    "/{project_id}/status",
    response_model=ProjectOut,
    summary="Update project status (internal/agent use)",
)
async def update_project_status(
    project_id: UUID,
    payload: ProjectUpdate,
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Update status (e.g., by agent orchestration or admin).
    Restricted to org_owner/admin or system.
    """
    project = await db.get(Project, project_id)
    if not project or project.org_id != UUID(current_user.org_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    # RBAC: only org owner/admin or system can update status
    if "org_owner" not in current_user.roles and "admin" not in current_user.roles:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")

    if payload.status:
        project.status = payload.status
    if payload.title:
        project.title = payload.title

    await db.commit()
    await db.refresh(project)

    audit_log.delay(
        current_user.id,
        "project_status_updated",
        {"project_id": str(project_id), "new_status": project.status}
    )

    # Notify on deployment success
    if project.status == ProjectStatus.DEPLOYED and project.deploy_url:
        send_deployment_success_email(
            email=current_user.email,
            project_title=project.title or "Untitled Project",
            deploy_url=project.deploy_url,
            preview_url=project.preview_url,
        )

    return project


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete project",
)
async def delete_project(
    project_id: UUID,
    current_user: Annotated[AuthUser, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Soft-delete a project (owner or org_admin only).
    """
    project = await db.get(Project, project_id)
    if not project or project.user_id != UUID(current_user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")

    # RBAC check
    if "org_owner" not in current_user.roles and str(project.user_id) != current_user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")

    project.deleted_at = datetime.utcnow()
    await db.commit()

    audit_log.delay(
        current_user.id,
        "project_deleted",
        {"project_id": str(project_id)}
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
