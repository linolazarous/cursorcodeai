# apps/api/app/services/email.py
"""
Resend Email Service - CursorCode AI
Async, retryable email sending with Resend API.
Handles: verification, password reset, low credits, deployment events, 2FA notifications.
Production-ready (February 2026): audit logging, error handling.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

import resend
from fastapi import BackgroundTasks

from app.core.config import settings
from app.services.logging import audit_log
from app.tasks.email import send_email_task  # Celery task for retries

logger = logging.getLogger(__name__)

# Initialize Resend client
resend.api_key = settings.RESEND_API_KEY.get_secret_value()


async def send_email(
    to: str,
    subject: str,
    html: Optional[str] = None,
    text: Optional[str] = None,
    from_email: str = settings.EMAIL_FROM,
    cc: Optional[List[str]] = None,
    bcc: Optional[List[str]] = None,
    reply_to: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Core async email sending function using Resend.
    Prioritizes HTML → plain text fallback.
    """
    try:
        payload = {
            "from": from_email,
            "to": [to],
            "subject": subject,
        }

        if html:
            payload["html"] = html
        elif text:
            payload["text"] = text
        else:
            raise ValueError("Either html or text content is required")

        if cc:
            payload["cc"] = cc
        if bcc:
            payload["bcc"] = bcc
        if reply_to:
            payload["reply_to"] = reply_to

        # Send via Resend (sync call — wrap in asyncio.to_thread if needed)
        response = await asyncio.to_thread(resend.Emails.send, payload)

        logger.info(f"Email sent to {to}: {subject} (id: {response.get('id')})")

        audit_log.delay(
            user_id=None,
            action="email_sent",
            metadata={
                "to": to,
                "subject": subject,
                "status": "success",
                "provider": "resend",
            },
        )

        return {
            "status": "success",
            "message_id": response.get("id"),
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
# Convenience Wrappers (queue via Celery or background_tasks)
# ────────────────────────────────────────────────

def send_verification_email(
    email: str,
    verification_url: str,
    background_tasks: Optional[BackgroundTasks] = None,
):
    html = f"""
    <h2>Welcome to CursorCode AI!</h2>
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="{verification_url}">Verify Email Address</a></p>
    <p>This link expires in 24 hours.</p>
    <p>If you didn't create this account, ignore this email.</p>
    <br>
    <p>Best regards,<br>CursorCode AI Team</p>
    """

    task_kwargs = {
        "to": email,
        "subject": "Verify Your CursorCode AI Account",
        "html": html,
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
    html = f"""
    <h2>Password Reset Request</h2>
    <p>Click the link below to reset your password:</p>
    <p><a href="{reset_url}">Reset Password</a></p>
    <p>This link expires in 1 hour.</p>
    <p>If you didn't request this, ignore this email.</p>
    <br>
    <p>Best regards,<br>CursorCode AI Team</p>
    """

    task_kwargs = {
        "to": email,
        "subject": "Reset Your CursorCode AI Password",
        "html": html,
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
    html = f"""
    <h2>Low Credits Alert</h2>
    <p>You have only <strong>{remaining}</strong> credits remaining.</p>
    <p>Upgrade your plan to continue using CursorCode AI without interruption.</p>
    <p><a href="{settings.FRONTEND_URL}/billing">Upgrade Now</a></p>
    <br>
    <p>Best regards,<br>CursorCode AI Team</p>
    """

    task_kwargs = {
        "to": email,
        "subject": "Low Credits Alert - CursorCode AI",
        "html": html,
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
    html = f"""
    <h2>Project Deployed Successfully!</h2>
    <p>Your project <strong>{project_title}</strong> is now live.</p>
    <p><a href="{deploy_url}">View Deployed Project</a></p>
    {f"<p><a href='{preview_url}'>Live Preview</a></p>" if preview_url else ""}
    <br>
    <p>Best regards,<br>CursorCode AI Team</p>
    """

    task_kwargs = {
        "to": email,
        "subject": f"Project Deployed Successfully: {project_title}",
        "html": html,
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)


def send_2fa_enabled_email(
    email: str,
    background_tasks: Optional[BackgroundTasks] = None,
):
    html = f"""
    <h2>Two-Factor Authentication Enabled</h2>
    <p>2FA has been successfully enabled on your account.</p>
    <p>Your account is now more secure.</p>
    <p>If this wasn't you, contact support immediately.</p>
    <br>
    <p>Best regards,<br>CursorCode AI Team</p>
    """

    task_kwargs = {
        "to": email,
        "subject": "Two-Factor Authentication Enabled on Your Account",
        "html": html,
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)


def send_2fa_disabled_email(
    email: str,
    background_tasks: Optional[BackgroundTasks] = None,
):
    html = f"""
    <h2>Two-Factor Authentication Disabled</h2>
    <p><strong>Security Alert:</strong> 2FA was disabled on your account.</p>
    <p>If this was not you, secure your account immediately.</p>
    <br>
    <p>Best regards,<br>CursorCode AI Team</p>
    """

    task_kwargs = {
        "to": email,
        "subject": "Two-Factor Authentication Disabled on Your Account",
        "html": html,
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
    html = f"""
    <h2>New Login Detected</h2>
    <p>A successful login with 2FA was detected from a new device/location.</p>
    <p><strong>IP:</strong> {ip_address}</p>
    <p><strong>User Agent:</strong> {user_agent}</p>
    <p>If this wasn't you, change your password and contact support.</p>
    <br>
    <p>Best regards,<br>CursorCode AI Team</p>
    """

    task_kwargs = {
        "to": email,
        "subject": "New Login Detected with 2FA",
        "html": html,
    }
    if background_tasks:
        background_tasks.add_task(send_email_task.delay, **task_kwargs)
    else:
        send_email_task.delay(**task_kwargs)
