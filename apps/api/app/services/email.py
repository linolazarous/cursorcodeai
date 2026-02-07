# apps/api/app/services/email.py
"""
SendGrid Email Service - CursorCode AI
Async, retryable email sending with dynamic templates.
Handles: verification, password reset, low credits, deployment events, 2FA notifications.
Production-ready (February 2026): audit logging, error handling, Sentry integration.
"""

import logging
from typing import Dict, List, Optional, Any
from base64 import b64encode

from fastapi import BackgroundTasks
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import (
    Mail,
    Email,
    To,
    Content,
    Personalization,
    Attachment,
    FileContent,
    FileName,
    FileType,
    Disposition,
)
import asyncio

from app.core.config import settings
from app.services.logging import audit_log
from app.tasks.email import send_email_task  # Celery task for retries

logger = logging.getLogger(__name__)

sendgrid_client = SendGridAPIClient(settings.SENDGRID_API_KEY.get_secret_value())


async def send_email(
    to: str,
    subject: str,
    template_id: Optional[str] = None,
    dynamic_data: Optional[Dict[str, Any]] = None,
    plain_text: Optional[str] = None,
    html_content: Optional[str] = None,
    from_email: str = settings.EMAIL_FROM,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    attachments: Optional[List[Dict[str, Any]]] = None,
    reply_to: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Core async email sending function.
    Prioritizes: dynamic template → HTML → plain text fallback.
    """
    message = Mail(from_email=Email(from_email), subject=subject)

    # Recipients
    to_email = To(to)
    message.to = [to_email]

    if cc:
        message.cc = [To(email) for email in cc]
    if bcc:
        message.bcc = [To(email) for email in bcc]
    if reply_to:
        message.reply_to = Email(reply_to)

    # Content
    if template_id:
        personalization = Personalization()
        personalization.add_to(to_email)
        personalization.dynamic_template_data = dynamic_data or {}
        message.add_personalization(personalization)
        message.template_id = template_id
    else:
        if html_content:
            message.add_content(Content("text/html", html_content))
        if plain_text:
            message.add_content(Content("text/plain", plain_text))

    # Attachments
    if attachments:
        for att in attachments:
            if "content" not in att or "filename" not in att:
                continue
            encoded = b64encode(att["content"]).decode()
            attachment = Attachment()
            attachment.file_content = FileContent(encoded)
            attachment.file_type = FileType(att.get("type", "application/octet-stream"))
            attachment.file_name = FileName(att["filename"])
            attachment.disposition = Disposition("attachment")
            message.add_attachment(attachment)

    try:
        response = await asyncio.to_thread(sendgrid_client.send, message)

        status_code = response.status_code
        if status_code not in (200, 202):
            raise ValueError(f"SendGrid returned {status_code}: {response.body}")

        logger.info(f"Email sent to {to}: {subject} (status: {status_code})")

        audit_log.delay(
            user_id=None,
            action="email_sent",
            metadata={
                "to": to,
                "subject": subject,
                "template_id": template_id,
                "status": status_code,
            },
        )

        return {
            "status": "success",
            "status_code": status_code,
            "message_id": response.headers.get("X-Message-Id")
        }

    except Exception as exc:
        logger.exception(f"Failed to send email to {to}: {subject}")
        audit_log.delay(
            user_id=None,
            action="email_failed",
            metadata={"to": to, "subject": subject, "error": str(exc)},
        )
        raise


# ────────────────────────────────────────────────
# Convenience Wrappers (queue via Celery)
# ────────────────────────────────────────────────

def send_verification_email(
    email: str,
    verification_url: str,
    background_tasks: Optional[BackgroundTasks] = None,
):
    task_kwargs = {
        "to": email,
        "subject": "Verify Your CursorCode AI Account",
        "template_id": settings.SENDGRID_VERIFY_TEMPLATE_ID,
        "dynamic_data": {
            "verification_url": verification_url,
            "expires_in_hours": 24
        },
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)


def send_password_reset_email(
    email: str,
    reset_url: str,
    background_tasks: Optional[BackgroundTasks] = None,
):
    task_kwargs = {
        "to": email,
        "subject": "Reset Your CursorCode AI Password",
        "template_id": settings.SENDGRID_RESET_TEMPLATE_ID,
        "dynamic_data": {
            "reset_url": reset_url,
            "expires_in_hours": 1
        },
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)


def send_low_credits_alert(
    email: str,
    remaining: int,
    background_tasks: Optional[BackgroundTasks] = None,
):
    task_kwargs = {
        "to": email,
        "subject": "Low Credits Alert - CursorCode AI",
        "template_id": settings.SENDGRID_LOW_CREDITS_TEMPLATE_ID,
        "dynamic_data": {
            "remaining": remaining,
            "upgrade_url": f"{settings.FRONTEND_URL}/billing"
        },
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)


def send_deployment_success_email(
    email: str,
    project_title: str,
    deploy_url: str,
    preview_url: Optional[str] = None,
    background_tasks: Optional[BackgroundTasks] = None,
):
    """
    Deployment Success Notification
    Sent when an AI-generated project is successfully built and deployed.
    """
    task_kwargs = {
        "to": email,
        "subject": f"Project Deployed Successfully: {project_title}",
        "template_id": settings.SENDGRID_DEPLOYMENT_SUCCESS_TEMPLATE_ID,
        "dynamic_data": {
            "project_title": project_title,
            "deploy_url": deploy_url,
            "preview_url": preview_url or "N/A",
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        },
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)


def send_2fa_enabled_email(
    email: str,
    background_tasks: Optional[BackgroundTasks] = None,
):
    """
    2FA Enabled Confirmation
    """
    task_kwargs = {
        "to": email,
        "subject": "Two-Factor Authentication Enabled on Your Account",
        "template_id": settings.SENDGRID_2FA_ENABLED_TEMPLATE_ID,
        "dynamic_data": {
            "email": email,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "security_url": f"{settings.FRONTEND_URL}/settings/security"
        },
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)


def send_2fa_disabled_email(
    email: str,
    background_tasks: Optional[BackgroundTasks] = None,
):
    """
    2FA Disabled Confirmation (security warning)
    """
    task_kwargs = {
        "to": email,
        "subject": "Two-Factor Authentication Disabled on Your Account",
        "template_id": settings.SENDGRID_2FA_DISABLED_TEMPLATE_ID,
        "dynamic_data": {
            "email": email,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "security_url": f"{settings.FRONTEND_URL}/settings/security"
        },
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)


def send_2fa_login_alert(
    email: str,
    ip_address: str,
    user_agent: str,
    background_tasks: Optional[BackgroundTasks] = None,
):
    """
    Security Alert: Successful 2FA Login
    (Can be toggled off in settings for trusted devices)
    """
    task_kwargs = {
        "to": email,
        "subject": "New Login Detected with 2FA",
        "template_id": settings.SENDGRID_2FA_LOGIN_ALERT_TEMPLATE_ID,
        "dynamic_data": {
            "email": email,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
            "security_url": f"{settings.FRONTEND_URL}/settings/security"
        },
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)