"""Branded transactional email via the project's own mailbox (cPanel SMTP).

Sends through help@mathgenius.guru so every message comes from the
official address. Pure stdlib (smtplib + email.mime) — no new dependencies.

Required env vars (see backend/.env.example):
    SMTP_HOST       e.g. mail.mathgenius.guru
    SMTP_PORT       465 (SSL) or 587 (STARTTLS). Defaults to 465.
    SMTP_USER       e.g. help@mathgenius.guru
    SMTP_PASSWORD   mailbox password (Render: SMTP_PASSWORD, sync: false)
Optional:
    SMTP_FROM_NAME  default "MathGenius"
    SMTP_FROM_EMAIL default SMTP_USER
    FRONTEND_URL    default https://mathgenius.guru (links + logo URL)
"""

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Brand (matches frontend/src/index.css light theme) ──────────────────
TEAL = "#1a6b6b"
TEAL_DARK = "#134f4f"
GOLD = "#c8941a"
INK = "#0e0c0a"
MUTED = "#6b6155"
PAPER = "#f5f0e8"
CREAM = "#ede8dc"

SITE_URL = os.environ.get("FRONTEND_URL", "https://mathgenius.guru").rstrip("/")
LOGO_URL = f"{SITE_URL}/icons/icon-192.png"


def _smtp_settings() -> dict:
    user = os.environ.get("SMTP_USER", "").strip()
    return {
        "host": os.environ.get("SMTP_HOST", "").strip(),
        "port": int(os.environ.get("SMTP_PORT", "465") or 465),
        "user": user,
        "password": os.environ.get("SMTP_PASSWORD", ""),
        "from_name": os.environ.get("SMTP_FROM_NAME", "MathGenius").strip() or "MathGenius",
        "from_email": os.environ.get("SMTP_FROM_EMAIL", "").strip() or user,
    }


def send_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """Send one HTML (+ optional plain-text) email. Returns True on success.

    Returns False (never raises) when SMTP is unconfigured or sending fails,
    so callers can retry later without breaking the request.
    """
    cfg = _smtp_settings()
    if not (cfg["host"] and cfg["user"] and cfg["password"]):
        logger.warning("SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD) — email skipped")
        return False
    if not to_email:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f'{cfg["from_name"]} <{cfg["from_email"]}>'
    msg["To"] = to_email
    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if cfg["port"] == 465:
            with smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=20) as smtp:
                smtp.login(cfg["user"], cfg["password"])
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(cfg["host"], cfg["port"], timeout=20) as smtp:
                smtp.ehlo()
                smtp.starttls()
                smtp.ehlo()
                smtp.login(cfg["user"], cfg["password"])
                smtp.send_message(msg)
        logger.info("Email sent to %s :: %s", to_email, subject)
        return True
    except Exception:
        logger.error("Email send failed to %s", to_email, exc_info=True)
        return False


def render_welcome_email(first_name: str = "") -> tuple:
    """Branded welcome email. Returns (subject, html_body, text_body)."""
    name = (first_name or "").strip() or "there"
    subject = f"Welcome to MathGenius, {name}!"

    dashboard_url = f"{SITE_URL}/dashboard"
    practice_url = f"{SITE_URL}/practice"
    teach_url = f"{SITE_URL}/teach"
    cbt_url = f"{SITE_URL}/cbt"
    help_email = "help@mathgenius.guru"

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:{CREAM};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:{CREAM};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background-color:{TEAL};padding:28px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td width="56" valign="middle">
              <img src="{LOGO_URL}" alt="MathGenius" width="48" height="48" style="display:block;width:48px;height:48px;background-color:#ffffff;border-radius:12px;">
            </td>
            <td valign="middle" style="padding-left:14px;">
              <div style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.5px;">MathGenius</div>
              <div style="color:#d7e9e9;font-size:13px;">AI-powered maths prep for WAEC, NECO &amp; JAMB</div>
            </td>
          </tr></table>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 36px 12px 36px;color:{INK};">
          <h1 style="margin:0 0 12px 0;font-size:24px;color:{INK};">Welcome aboard, {name}!</h1>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:{INK};">
            Your MathGenius account is ready. You now have an AI study partner that explains
            every step, drills you on past questions, and tracks your mastery topic by topic.
          </p>
          <p style="margin:0 0 8px 0;font-size:15px;font-weight:bold;color:{INK};">Get started in 3 steps:</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
            <tr>
              <td style="padding:8px 0;font-size:14px;color:{INK};"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background-color:{GOLD};color:#ffffff;border-radius:50%;font-weight:bold;font-size:13px;">1</span>&nbsp;&nbsp;<a href="{practice_url}" style="color:{TEAL};font-weight:bold;text-decoration:none;">Practise past questions</a> <span style="color:{MUTED};">— with instant step-by-step solutions</span></td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:{INK};"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background-color:{GOLD};color:#ffffff;border-radius:50%;font-weight:bold;font-size:13px;">2</span>&nbsp;&nbsp;<a href="{teach_url}" style="color:{TEAL};font-weight:bold;text-decoration:none;">Ask Euler anything</a> <span style="color:{MUTED};">— your AI maths tutor, 24/7</span></td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:14px;color:{INK};"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background-color:{GOLD};color:#ffffff;border-radius:50%;font-weight:bold;font-size:13px;">3</span>&nbsp;&nbsp;<a href="{cbt_url}" style="color:{TEAL};font-weight:bold;text-decoration:none;">Simulate the real exam</a> <span style="color:{MUTED};">— timed CBT just like WAEC &amp; JAMB</span></td>
            </tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;"><tr><td align="center" style="background-color:{TEAL};border-radius:12px;">
            <a href="{dashboard_url}" style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;">Open My Dashboard</a>
          </td></tr></table>
          <p style="margin:0;font-size:14px;line-height:1.6;color:{MUTED};">
            Need a hand? Just reply to this email — a real human reads every message.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background-color:{PAPER};padding:20px 36px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:13px;color:{MUTED};">
            <a href="{SITE_URL}" style="color:{TEAL};text-decoration:none;">mathgenius.guru</a>
            &nbsp;·&nbsp;
            <a href="mailto:{help_email}" style="color:{TEAL};text-decoration:none;">{help_email}</a>
          </p>
          <p style="margin:0;font-size:12px;color:{MUTED};">© 2026 MathGenius. You received this because you created a MathGenius account.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

    text_body = (
        f"Welcome to MathGenius, {name}!\n\n"
        "Your account is ready. Get started:\n"
        f"1. Practise past questions: {practice_url}\n"
        f"2. Ask Euler, your AI tutor: {teach_url}\n"
        f"3. Simulate the real exam: {cbt_url}\n\n"
        f"Open your dashboard: {dashboard_url}\n\n"
        f"Need help? Reply to this email ({help_email}).\n"
        "© 2026 MathGenius · mathgenius.guru"
    )
    return subject, html_body, text_body
