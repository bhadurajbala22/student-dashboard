"""Outbound delivery channels. Stdlib only — no extra dependencies."""
import json
import logging
import re
import smtplib
import ssl
import urllib.error
import urllib.parse
import urllib.request
from email.message import EmailMessage
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid

from . import settings as S

log = logging.getLogger("nexus.notify")


class DeliveryError(RuntimeError):
    pass


def _post_json(url: str, payload: dict, headers: dict, timeout: int = 20) -> dict:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, method="POST",
                                 headers={"Content-Type": "application/json", **headers})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode() or "{}"
            return json.loads(raw) if raw.strip().startswith(("{", "[")) else {"raw": raw}
    except urllib.error.HTTPError as e:
        raise DeliveryError(f"{url} -> HTTP {e.code}: {e.read().decode()[:300]}") from e
    except Exception as e:                                    # network, DNS, timeout
        raise DeliveryError(f"{url} -> {e}") from e


def _post_form(url: str, data: dict, headers: dict | None = None, auth: tuple | None = None,
               timeout: int = 20) -> dict:
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, method="POST", headers=headers or {})
    if auth:
        import base64
        token = base64.b64encode(f"{auth[0]}:{auth[1]}".encode()).decode()
        req.add_header("Authorization", f"Basic {token}")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode() or "{}"
            return json.loads(raw) if raw.strip().startswith(("{", "[")) else {"raw": raw}
    except urllib.error.HTTPError as e:
        raise DeliveryError(f"{url} -> HTTP {e.code}: {e.read().decode()[:300]}") from e
    except Exception as e:
        raise DeliveryError(f"{url} -> {e}") from e


# ═══════════════════════════════════════════════════════════════════ email
def build_message(to: str, subject: str, html: str, text: str,
                  ics: str | None = None, ics_method: str = "REQUEST",
                  ics_filename: str = "session.ics"):
    """Build the message with the MIME layout mail clients actually expect.

        multipart/mixed
          multipart/alternative
            text/plain
            text/html
            text/calendar; method=REQUEST     <- makes Gmail render the RSVP card
          text/calendar (attachment)          <- covers clients that want a file

    The calendar part must be a *sibling* of text/html inside the alternative.
    Nesting it any deeper makes clients choose between the HTML and the invite
    instead of showing the invite alongside the HTML.
    """
    alternative = MIMEMultipart("alternative")
    alternative.attach(MIMEText(text, "plain", "utf-8"))
    alternative.attach(MIMEText(html, "html", "utf-8"))

    if ics:
        # let MIMEText choose the transfer encoding; overriding the header
        # without re-encoding the payload silently corrupts the invite
        cal = MIMEText(ics, "calendar", "utf-8")
        cal.set_param("method", ics_method)
        alternative.attach(cal)

    if ics:
        root = MIMEMultipart("mixed")
        root.attach(alternative)
        part = MIMEBase("text", "calendar", charset="utf-8", method=ics_method)
        part.set_payload(ics.encode("utf-8"))
        from email import encoders
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", "attachment", filename=ics_filename)
        root.attach(part)
    else:
        root = alternative

    root["From"] = formataddr((S.MAIL_FROM_NAME, S.MAIL_FROM))
    root["To"] = to
    root["Subject"] = subject
    root["Message-ID"] = make_msgid(domain=S.MAIL_FROM.split("@")[-1] or "upscnexus.local")
    if S.MAIL_REPLY_TO:
        root["Reply-To"] = S.MAIL_REPLY_TO
    root["X-Entity-Ref-ID"] = root["Message-ID"]      # stops Gmail threading everything
    return root


def _send_smtp(msg) -> dict:
    if not (S.SMTP_HOST and S.SMTP_USER and S.SMTP_PASSWORD):
        raise DeliveryError("SMTP_HOST / SMTP_USER / SMTP_PASSWORD are not set")
    context = ssl.create_default_context()
    try:
        if S.SMTP_SECURITY == "ssl":
            server = smtplib.SMTP_SSL(S.SMTP_HOST, S.SMTP_PORT,
                                      timeout=S.SMTP_TIMEOUT, context=context)
        else:
            server = smtplib.SMTP(S.SMTP_HOST, S.SMTP_PORT, timeout=S.SMTP_TIMEOUT)
        with server:
            server.ehlo()
            if S.SMTP_SECURITY == "starttls":
                server.starttls(context=context)
                server.ehlo()
            if S.SMTP_USER:
                server.login(S.SMTP_USER, S.SMTP_PASSWORD)
            server.send_message(msg)
    except smtplib.SMTPAuthenticationError as e:
        raise DeliveryError(
            "SMTP login rejected. For Gmail you must use a 16-character App "
            f"Password with 2-Step Verification on — not your normal password. ({e.smtp_code})"
        ) from e
    except DeliveryError:
        raise
    except Exception as e:
        raise DeliveryError(f"SMTP send failed: {e}") from e
    return {"provider": "smtp", "id": msg["Message-ID"]}


def _send_resend(msg, to: str, subject: str, html: str, text: str,
                 ics: str | None) -> dict:
    payload = {
        "from": formataddr((S.MAIL_FROM_NAME, S.MAIL_FROM)),
        "to": [to], "subject": subject, "html": html, "text": text,
    }
    if S.MAIL_REPLY_TO:
        payload["reply_to"] = S.MAIL_REPLY_TO
    if ics:
        import base64
        payload["attachments"] = [{
            "filename": "session.ics",
            "content": base64.b64encode(ics.encode()).decode(),
        }]
    res = _post_json("https://api.resend.com/emails", payload,
                     {"Authorization": f"Bearer {S.RESEND_API_KEY}"})
    return {"provider": "resend", "id": res.get("id", "")}


def send_email(to: str, subject: str, html: str, text: str,
               ics: str | None = None, ics_method: str = "REQUEST") -> dict:
    if not to or "@" not in to:
        raise DeliveryError(f"invalid recipient address: {to!r}")

    if S.MAIL_PROVIDER == "console" or not S.email_configured():
        log.info("[email:console] to=%s subject=%s%s\n%s",
                 to, subject, " (+calendar invite)" if ics else "", text[:600])
        return {"provider": "console", "id": "logged"}

    msg = build_message(to, subject, html, text, ics, ics_method)
    if S.MAIL_PROVIDER == "smtp":
        return _send_smtp(msg)
    if S.MAIL_PROVIDER == "resend":
        return _send_resend(msg, to, subject, html, text, ics)
    raise DeliveryError(f"unknown MAIL_PROVIDER {S.MAIL_PROVIDER!r}")


# ═════════════════════════════════════════════════════════════════════ sms
def normalise_msisdn(raw: str) -> str:
    """'+91 98765 43210' / '09876543210' → '919876543210'."""
    digits = re.sub(r"\D", "", raw or "")
    if not digits:
        raise DeliveryError("empty mobile number")
    digits = digits.lstrip("0")
    cc = S.SMS_DEFAULT_COUNTRY
    if len(digits) == 10:
        digits = cc + digits
    return digits


def _send_msg91(to: str, body: str, otp: str | None) -> dict:
    # MSG91 has a dedicated OTP endpoint that works with DLT-approved templates
    if otp and S.MSG91_OTP_TEMPLATE_ID:
        url = "https://control.msg91.com/api/v5/otp?" + urllib.parse.urlencode({
            "template_id": S.MSG91_OTP_TEMPLATE_ID, "mobile": to, "otp": otp,
        })
        req = urllib.request.Request(url, method="POST",
                                     headers={"authkey": S.MSG91_AUTH_KEY,
                                              "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, data=b"{}", timeout=20) as res:
                return {"provider": "msg91", "raw": json.loads(res.read().decode() or "{}")}
        except urllib.error.HTTPError as e:
            raise DeliveryError(f"msg91 otp -> HTTP {e.code}: {e.read().decode()[:300]}") from e
        except Exception as e:
            raise DeliveryError(f"msg91 otp -> {e}") from e

    payload = {
        "sender": S.MSG91_SENDER_ID,
        "route": "4",
        "country": S.SMS_DEFAULT_COUNTRY,
        "sms": [{"message": body, "to": [to]}],
    }
    if S.MSG91_DLT_TE_ID:
        payload["DLT_TE_ID"] = S.MSG91_DLT_TE_ID
    res = _post_json("https://control.msg91.com/api/v2/sendsms", payload,
                     {"authkey": S.MSG91_AUTH_KEY})
    return {"provider": "msg91", "raw": res}


def _send_twilio(to: str, body: str) -> dict:
    url = (f"https://api.twilio.com/2010-04-01/Accounts/"
           f"{S.TWILIO_ACCOUNT_SID}/Messages.json")
    res = _post_form(url, {"To": f"+{to}", "From": S.TWILIO_FROM, "Body": body},
                     auth=(S.TWILIO_ACCOUNT_SID, S.TWILIO_AUTH_TOKEN))
    return {"provider": "twilio", "id": res.get("sid", "")}


def _send_fast2sms(to: str, body: str, otp: str | None) -> dict:
    data = ({"variables_values": otp, "route": "otp", "numbers": to[-10:]} if otp
            else {"route": "q", "message": body, "numbers": to[-10:], "flash": "0"})
    res = _post_form("https://www.fast2sms.com/dev/bulkV2", data,
                     headers={"authorization": S.FAST2SMS_API_KEY})
    return {"provider": "fast2sms", "raw": res}


def send_sms(to: str, body: str, otp: str | None = None) -> dict:
    if S.SMS_PROVIDER == "console" or not S.sms_configured():
        log.info("[sms:console] to=%s | %s", to, body)
        return {"provider": "console", "id": "logged"}

    number = normalise_msisdn(to)
    if S.SMS_PROVIDER == "msg91":
        return _send_msg91(number, body, otp)
    if S.SMS_PROVIDER == "twilio":
        return _send_twilio(number, body)
    if S.SMS_PROVIDER == "fast2sms":
        return _send_fast2sms(number, body, otp)
    raise DeliveryError(f"unknown SMS_PROVIDER {S.SMS_PROVIDER!r}")
