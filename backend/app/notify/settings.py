"""Environment-driven configuration for outbound email and SMS.

Nothing here is hardcoded: every credential comes from the environment (or a
.env file next to the backend). If a provider is not configured the channel
falls back to `console`, which logs the message instead of sending it — so a
fresh checkout still runs without any third-party account.
"""
# The .env search lives in app.envfile so the database and the notification
# credentials cannot disagree about which file was loaded.
from ..envfile import ENV_CANDIDATES, LOADED_ENV_FILES  # noqa: F401  (re-exported)
from ..envfile import env as _env
from ..envfile import env_bool as _bool


# ── where links in emails point ───────────────────────────────────────────
PUBLIC_BASE_URL = _env("PUBLIC_BASE_URL", "http://localhost:5173").rstrip("/")
SUPPORT_EMAIL = _env("SUPPORT_EMAIL", "support@upscnexus.local")

# ── email ─────────────────────────────────────────────────────────────────
# smtp   → any SMTP server, including Gmail with an App Password
# resend → Resend HTTP API
# console→ log only (default)
MAIL_PROVIDER = _env("MAIL_PROVIDER", "console").lower()
MAIL_FROM_NAME = _env("MAIL_FROM_NAME", "ToppersDeck")
MAIL_FROM = _env("MAIL_FROM", "no-reply@upscnexus.local")
MAIL_REPLY_TO = _env("MAIL_REPLY_TO")

SMTP_HOST = _env("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(_env("SMTP_PORT", "587") or 587)
SMTP_USER = _env("SMTP_USER")
SMTP_PASSWORD = _env("SMTP_PASSWORD")
SMTP_SECURITY = _env("SMTP_SECURITY", "starttls").lower()   # starttls | ssl | none
SMTP_TIMEOUT = int(_env("SMTP_TIMEOUT", "20") or 20)

RESEND_API_KEY = _env("RESEND_API_KEY")

# ── sms ───────────────────────────────────────────────────────────────────
# msg91 | twilio | fast2sms | console
SMS_PROVIDER = _env("SMS_PROVIDER", "console").lower()
SMS_DEFAULT_COUNTRY = _env("SMS_DEFAULT_COUNTRY", "91")

MSG91_AUTH_KEY = _env("MSG91_AUTH_KEY")
MSG91_SENDER_ID = _env("MSG91_SENDER_ID", "NEXUSP")
MSG91_OTP_TEMPLATE_ID = _env("MSG91_OTP_TEMPLATE_ID")
MSG91_DLT_TE_ID = _env("MSG91_DLT_TE_ID")

TWILIO_ACCOUNT_SID = _env("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = _env("TWILIO_AUTH_TOKEN")
TWILIO_FROM = _env("TWILIO_FROM")

FAST2SMS_API_KEY = _env("FAST2SMS_API_KEY")

# ── behaviour ─────────────────────────────────────────────────────────────
NOTIFY_ENABLED = _bool("NOTIFY_ENABLED", True)
SEND_SESSION_INVITES = _bool("SEND_SESSION_INVITES", True)
REMINDER_MINUTES = int(_env("REMINDER_MINUTES", "60") or 60)

# Auto-generate a working video room when the mentor doesn't supply a link.
# jitsi  → a real, instantly usable room (no API key needed)
# none   → leave it to the mentor to paste their own Google Meet / Zoom link
MEET_PROVIDER = _env("MEET_PROVIDER", "jitsi").lower()
JITSI_BASE = _env("JITSI_BASE", "https://meet.jit.si").rstrip("/")


def email_configured() -> bool:
    if MAIL_PROVIDER == "smtp":
        return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)
    if MAIL_PROVIDER == "resend":
        return bool(RESEND_API_KEY)
    return False


def sms_configured() -> bool:
    if SMS_PROVIDER == "msg91":
        return bool(MSG91_AUTH_KEY)
    if SMS_PROVIDER == "twilio":
        return bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_FROM)
    if SMS_PROVIDER == "fast2sms":
        return bool(FAST2SMS_API_KEY)
    return False


def status() -> dict:
    """Safe to log and to expose to an admin — contains no secrets."""
    return {
        "env_files_loaded": LOADED_ENV_FILES,
        "env_files_searched": [str(c) for c in ENV_CANDIDATES],
        "email_provider": MAIL_PROVIDER,
        "email_configured": email_configured(),
        "email_from": MAIL_FROM,
        "sms_provider": SMS_PROVIDER,
        "sms_configured": sms_configured(),
        "notify_enabled": NOTIFY_ENABLED,
        "session_invites": SEND_SESSION_INVITES,
        "meet_provider": MEET_PROVIDER,
        "public_base_url": PUBLIC_BASE_URL,
    }
