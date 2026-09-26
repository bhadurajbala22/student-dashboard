"""HTML email templates — table-based and inline-styled, because that is what
survives Gmail, Outlook and Apple Mail. Palette matches the app: navy and gold.
"""
from . import settings as S

# Brand palette: #000814 · #001D3D · #003566 · #FFC300 · #FFD60A
RED = "#003566"    # accent: links, rules, the verification code
GOLD = "#ffc300"   # highlight: the call-to-action button
DEEP = "#001d3d"
INK = "#000814"
MUTED = "#3f5a78"
LINE = "#dbe4ef"
WASH = "#eef4fb"


def _shell(title: str, preheader: str, body: str, cta_label: str = "",
           cta_url: str = "") -> str:
    cta = ""
    if cta_label and cta_url:
        cta = f"""
        <tr><td style="padding:8px 32px 28px">
          <a href="{cta_url}" style="display:inline-block;background:{GOLD};color:#001d3d;
             text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;
             border-radius:10px">{cta_label}</a>
        </td></tr>"""
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title></head>
<body style="margin:0;padding:0;background:#f2f6fb;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6fb;padding:28px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="max-width:560px;background:#ffffff;border:1px solid {LINE};border-radius:16px;overflow:hidden">

    <tr><td style="background:{DEEP};padding:20px 32px">
      <span style="color:#ffffff;font-size:19px;font-weight:800;letter-spacing:-.4px">
        Toppers<span style="color:#ffc300">Deck</span></span>
      <div style="color:#ffd60a;font-size:10px;font-weight:700;letter-spacing:1.6px;
        text-transform:uppercase;margin-top:3px">Learn. Rise. Lead.</div>
    </td></tr>

    <tr><td style="padding:30px 32px 6px">
      <h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:{INK};
        letter-spacing:-.5px">{title}</h1>
      {body}
    </td></tr>
    {cta}

    <tr><td style="padding:20px 32px 26px;border-top:1px solid {LINE}">
      <p style="margin:0;font-size:11.5px;line-height:1.6;color:#5f7c99">
        You're receiving this because you have an account on ToppersDeck.<br>
        Questions? Reply to this email or write to {S.SUPPORT_EMAIL}.
      </p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>"""


def _p(text: str) -> str:
    return (f'<p style="margin:0 0 14px;font-size:14.5px;line-height:1.65;color:{MUTED}">'
            f'{text}</p>')


def _rows(pairs: list[tuple[str, str]]) -> str:
    cells = "".join(f"""
      <tr>
        <td style="padding:7px 0;font-size:13px;color:#5f7c99;width:42%">{k}</td>
        <td style="padding:7px 0;font-size:13.5px;color:{INK};font-weight:700">{v}</td>
      </tr>""" for k, v in pairs if v)
    return f"""<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="background:#f2f6fb;border-radius:12px;padding:10px 16px;margin:4px 0 18px">
      {cells}</table>"""


# ═══════════════════════════════════════════════════════════════════ OTP
def otp_email(code: str, minutes: int, purpose: str = "verify your email") -> tuple[str, str, str]:
    subject = f"{code} is your ToppersDeck verification code"
    body = (
        _p(f"Use this code to {purpose}. It expires in <strong>{minutes} minutes</strong>.")
        + f"""<div style="margin:18px 0 20px;background:{WASH};border:1px solid #ffe98c;
             border-radius:12px;padding:18px;text-align:center">
             <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:{RED};
               font-family:ui-monospace,SFMono-Regular,Menlo,monospace">{code}</div></div>"""
        + _p("If you didn't request this, you can safely ignore this email — "
             "nobody can act on it without the code.")
    )
    text = (f"Your ToppersDeck verification code is {code}\n\n"
            f"It expires in {minutes} minutes. If you didn't request this, ignore this email.")
    return subject, _shell("Verify your account", f"Your code is {code}", body), text


def otp_sms(code: str, minutes: int) -> str:
    return (f"{code} is your ToppersDeck verification code. "
            f"Valid for {minutes} minutes. Do not share it with anyone.")


# ═══════════════════════════════════════════════════ session lifecycle
def session_confirmed(*, to_name: str, peer_name: str, is_mentor: bool, title: str,
                      when: str, duration: str, subject_line: str, meet_url: str,
                      agenda: str, reference: str, amount: str,
                      calendar_url: str) -> tuple[str, str, str]:
    who = "your aspirant" if is_mentor else "your mentor"
    subject = f"Confirmed · {title} with {peer_name}, {when}"
    body = (
        _p(f"Your session with <strong>{peer_name}</strong> ({who}) is confirmed. "
           "The invite is attached — accept it and the event lands in your calendar "
           "with a reminder.")
        + _rows([
            ("When", when), ("Duration", duration), ("Focus", subject_line),
            ("Reference", reference), ("Amount", amount),
        ])
        + (f"""<div style="background:{WASH};border-left:3px solid {RED};padding:12px 16px;
             border-radius:8px;margin:0 0 18px">
             <div style="font-size:11px;font-weight:800;text-transform:uppercase;
               letter-spacing:.8px;color:{RED};margin-bottom:5px">Agenda</div>
             <div style="font-size:13.5px;line-height:1.6;color:{MUTED}">{agenda}</div>
             </div>""" if agenda else "")
        + _p(f'Can\'t use the attachment? '
             f'<a href="{calendar_url}" style="color:{RED};font-weight:700">'
             f'Add to Google Calendar</a>.')
    )
    text = (f"Your session with {peer_name} is confirmed.\n\n"
            f"When: {when}\nDuration: {duration}\nFocus: {subject_line}\n"
            f"Reference: {reference}\n\nJoin: {meet_url}\n\n"
            + (f"Agenda: {agenda}\n\n" if agenda else "")
            + f"Add to Google Calendar: {calendar_url}")
    return subject, _shell("Your session is confirmed",
                           f"{when} with {peer_name}", body,
                           "Join the video room", meet_url), text


def session_requested(*, mentor_name: str, student_name: str, title: str, when: str,
                      subject_line: str, agenda: str, amount: str,
                      payout: str) -> tuple[str, str, str]:
    subject = f"New request · {title} from {student_name}"
    body = (
        _p(f"<strong>{student_name}</strong> has requested a session and the payment is "
           "already held in escrow. Confirm it to lock the slot on your calendar.")
        + _rows([("Requested slot", when), ("Focus", subject_line),
                 ("Order value", amount), ("Your payout", payout)])
        + (f"""<div style="background:{WASH};border-left:3px solid {RED};padding:12px 16px;
             border-radius:8px;margin:0 0 18px">
             <div style="font-size:11px;font-weight:800;text-transform:uppercase;
               letter-spacing:.8px;color:{RED};margin-bottom:5px">What they want from the hour</div>
             <div style="font-size:13.5px;line-height:1.6;color:{MUTED}">{agenda}</div>
             </div>""" if agenda else "")
    )
    text = (f"{student_name} requested a session.\n\nSlot: {when}\nFocus: {subject_line}\n"
            f"Value: {amount} (your payout {payout})\n\n"
            + (f"Agenda: {agenda}\n\n" if agenda else "")
            + f"Review it at {S.PUBLIC_BASE_URL}/app/requests")
    return subject, _shell("New session request", f"{student_name} · {when}", body,
                           "Review the request",
                           f"{S.PUBLIC_BASE_URL}/app/requests"), text


def session_reminder(*, to_name: str, peer_name: str, title: str, when: str,
                     minutes_away: int, meet_url: str) -> tuple[str, str, str]:
    subject = f"Starting in {minutes_away} minutes · {title} with {peer_name}"
    body = (_p(f"Your session with <strong>{peer_name}</strong> starts at "
               f"<strong>{when}</strong> — about {minutes_away} minutes from now.")
            + _p("The video room opens five minutes before the start time."))
    text = (f"Your session with {peer_name} starts at {when} "
            f"(~{minutes_away} minutes).\n\nJoin: {meet_url}")
    return subject, _shell("Your session is about to start",
                           f"{title} · {when}", body, "Join the video room", meet_url), text


def session_cancelled(*, peer_name: str, title: str, when: str, by_role: str,
                      reference: str) -> tuple[str, str, str]:
    subject = f"Cancelled · {title} with {peer_name}, {when}"
    body = (_p(f"The session scheduled for <strong>{when}</strong> with "
               f"<strong>{peer_name}</strong> was cancelled by the {by_role}.")
            + _rows([("Reference", reference), ("Refund", "Returned to the original method "
                                                "or your retainer credits")])
            + _p("The calendar entry is withdrawn automatically."))
    text = (f"The session on {when} with {peer_name} was cancelled by the {by_role}.\n"
            f"Reference: {reference}")
    return subject, _shell("Session cancelled", f"{when} · {peer_name}", body,
                           "See your bookings", f"{S.PUBLIC_BASE_URL}/app/orders"), text


# ═══════════════════════════════════════════════════ copy evaluation
def evaluation_ready(*, student_name: str, mentor_name: str, subject_line: str,
                     marks: str, feedback: str, reference: str) -> tuple[str, str, str]:
    subject = f"Your evaluated copy is back · {subject_line or reference}"
    body = (
        _p(f"<strong>{mentor_name}</strong> has returned your copy. Download the annotated "
           "PDF from your workspace, then approve the order to release their payment.")
        + _rows([("Paper", subject_line), ("Marks", marks), ("Reference", reference)])
        + (f"""<div style="background:{WASH};border-left:3px solid {RED};padding:12px 16px;
             border-radius:8px;margin:0 0 18px">
             <div style="font-size:11px;font-weight:800;text-transform:uppercase;
               letter-spacing:.8px;color:{RED};margin-bottom:5px">Summary feedback</div>
             <div style="font-size:13.5px;line-height:1.6;color:{MUTED}">{feedback}</div>
             </div>""" if feedback else "")
    )
    text = (f"{mentor_name} returned your copy.\nPaper: {subject_line}\nMarks: {marks}\n"
            + (f"\nFeedback: {feedback}\n" if feedback else "")
            + f"\nDownload it at {S.PUBLIC_BASE_URL}/app/orders")
    return subject, _shell("Your evaluated copy is ready",
                           f"{mentor_name} returned {reference}", body,
                           "Download the checked copy",
                           f"{S.PUBLIC_BASE_URL}/app/orders"), text


def copy_submitted(*, mentor_name: str, student_name: str, count: int, sla_hours: int,
                   deadline: str, subject_line: str, reference: str) -> tuple[str, str, str]:
    subject = f"New copy to evaluate · {count} answer(s), due {deadline}"
    body = (
        _p(f"<strong>{student_name}</strong> has submitted {count} answer(s) for evaluation. "
           f"Your guaranteed turnaround is <strong>{sla_hours} hours</strong>.")
        + _rows([("Paper", subject_line), ("Answers", str(count)),
                 ("SLA deadline", deadline), ("Reference", reference)])
        + _p("If the deadline passes the aspirant is refunded automatically and the order "
             "is closed, so start early if the queue is busy.")
    )
    text = (f"{student_name} submitted {count} answer(s).\nPaper: {subject_line}\n"
            f"SLA deadline: {deadline}\n\nOpen the queue: {S.PUBLIC_BASE_URL}/app/queue")
    return subject, _shell("New copy in your queue", f"Due {deadline}", body,
                           "Open the copy queue", f"{S.PUBLIC_BASE_URL}/app/queue"), text
