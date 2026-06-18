"""Optional email notifications (Resend API). Gracefully no-ops when not configured."""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("NOTIFICATION_FROM_EMAIL", "Solar KapitBahay <onboarding@solarkapitbahay.app>")


def email_configured() -> bool:
    return bool(RESEND_API_KEY)


def send_email(*, to: str, subject: str, html: str) -> bool:
    if not RESEND_API_KEY:
        logger.info("Email skipped (RESEND_API_KEY not set): %s → %s", subject, to)
        return False
    try:
        resp = httpx.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
            json={"from": FROM_EMAIL, "to": [to], "subject": subject, "html": html},
            timeout=15.0,
        )
        resp.raise_for_status()
        return True
    except Exception as exc:
        logger.warning("Failed to send email to %s: %s", to, exc)
        return False


def send_registration_rejected(
    *,
    to: str,
    display_name: str,
    barangay_name: str,
    reason: str | None = None,
) -> bool:
    reason_block = (
        f"<p><strong>Reason:</strong> {reason}</p>"
        if reason
        else "<p>Please contact your barangay operator for more information.</p>"
    )
    html = f"""
    <p>Hi {display_name},</p>
    <p>Your household registration for <strong>{barangay_name}</strong> was not approved at this time.</p>
    {reason_block}
    <p>You may sign in again to update your details or contact your barangay energy operator.</p>
    <p>— Solar KapitBahay</p>
    """
    return send_email(to=to, subject=f"Registration update — {barangay_name}", html=html)


def send_registration_approved(
    *,
    to: str,
    display_name: str,
    barangay_name: str,
    household_id: str,
) -> bool:
    html = f"""
    <p>Hi {display_name},</p>
    <p>Your household registration for <strong>{barangay_name}</strong> has been approved.</p>
    <p>Your household ID: <strong>{household_id}</strong></p>
    <p>Sign in to view your energy dashboard and sharing status.</p>
    <p>— Solar KapitBahay</p>
    """
    return send_email(to=to, subject=f"Welcome — {barangay_name}", html=html)
