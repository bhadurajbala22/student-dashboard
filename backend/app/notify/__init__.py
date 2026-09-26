"""Outbound notifications: transactional email, SMS and calendar invites.

Every send goes through a small background worker pool so a slow SMTP handshake
can never stall an API request, and a failed send can never fail a booking.
"""
import logging
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from . import settings as S
from .channels import DeliveryError, send_email, send_sms
from .ics import build_invite, google_calendar_link
from . import templates as T

log = logging.getLogger("nexus.notify")
_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="notify")

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def pretty(dt: datetime | None) -> str:
    if not dt:
        return ""
    hour = dt.hour % 12 or 12
    ampm = "am" if dt.hour < 12 else "pm"
    return (f"{DAYS[dt.weekday()]}, {dt.day} {MONTHS[dt.month - 1]} · "
            f"{hour}:{dt.minute:02d} {ampm} IST")


def rupees(n) -> str:
    try:
        return f"₹{int(n):,}"
    except (TypeError, ValueError):
        return str(n or "")


def _run(fn, *args, **kwargs):
    """Fire-and-forget: log failures, never raise into the caller."""
    if not S.NOTIFY_ENABLED:
        return

    def wrapped():
        try:
            fn(*args, **kwargs)
        except DeliveryError as e:
            log.warning("notification not delivered: %s", e)
        except Exception:
            log.exception("notification crashed")

    _pool.submit(wrapped)


def shutdown():
    _pool.shutdown(wait=False, cancel_futures=True)


# ═════════════════════════════════════════════════════════════════════ OTP
def send_otp(*, channel: str, target: str, code: str, minutes: int) -> dict:
    """Synchronous on purpose — the caller needs to know whether it went out,
    so the UI can tell the user to check their inbox rather than guessing."""
    if channel == "email":
        subject, html, text = T.otp_email(code, minutes)
        return send_email(target, subject, html, text)
    return send_sms(target, T.otp_sms(code, minutes), otp=code)


# ═══════════════════════════════════════════════════════ video room links
_SAFE = re.compile(r"[^a-zA-Z0-9]+")


def meeting_url(reference: str, mentor_supplied: str = "") -> str:
    """Prefer whatever the mentor pasted (their own Meet/Zoom room). Otherwise
    mint a real, immediately usable room — Jitsi needs no API key or account."""
    if mentor_supplied:
        return mentor_supplied
    if S.MEET_PROVIDER == "jitsi":
        slug = _SAFE.sub("", reference) or "session"
        return f"{S.JITSI_BASE}/upsc-nexus-{slug}"
    return ""


# ═════════════════════════════════════════════════ session notifications
def session_confirmed(*, order, student, mentor) -> None:
    """Email both sides with a real calendar invite attached."""
    if not S.SEND_SESSION_INVITES or not order.start_at:
        return

    when = pretty(order.start_at)
    duration = f"{order.duration_minutes} minutes"
    url = order.meeting_link or ""
    anon = bool(order.is_anonymous)
    title = order.title or "Mentorship session"

    description = (
        f"{title}\n"
        f"Mentor: {mentor.display_name}\n"
        f"Aspirant: {('Aspirant ' + order.anon_handle) if anon else student.display_name}\n"
        f"Reference: {order.reference}\n"
        + (f"Focus: {order.subject}\n" if order.subject else "")
        + (f"\nJoin: {url}\n" if url else "")
        + (f"\nAgenda: {order.agenda}\n" if order.agenda and not anon else "")
        + f"\nManage this booking: {S.PUBLIC_BASE_URL}/app/orders"
    )
    cal_link = google_calendar_link(
        summary=f"ToppersDeck · {title}", description=description,
        start=order.start_at, end=order.end_at, location=url)

    # Anonymous bookings must not leak the aspirant's address into the invite,
    # so each side gets an invite listing only themselves.
    for recipient, peer, is_mentor in ((student, mentor, False), (mentor, student, True)):
        if not recipient.email:
            continue
        peer_name = (f"Aspirant {order.anon_handle}"
                     if (anon and is_mentor) else peer.display_name)
        ics = build_invite(
            uid_seed=f"{order.reference}-{recipient.id}",
            summary=f"ToppersDeck · {title} with {peer_name}",
            description=description, start=order.start_at, end=order.end_at,
            organiser_name=S.MAIL_FROM_NAME, organiser_email=S.MAIL_FROM,
            attendees=[(recipient.display_name, recipient.email)],
            location=url, url=url, reminder_minutes=30,
        )
        subject, html, text = T.session_confirmed(
            to_name=recipient.display_name, peer_name=peer_name, is_mentor=is_mentor,
            title=title, when=when, duration=duration,
            subject_line=order.subject or "General strategy", meet_url=url,
            agenda="" if (anon and is_mentor and not order.agenda) else (order.agenda or ""),
            reference=order.reference,
            amount="Retainer credit" if order.paid_with_credit else rupees(order.amount),
            calendar_url=cal_link,
        )
        _run(send_email, recipient.email, subject, html, text, ics, "REQUEST")

        if recipient.mobile:
            _run(send_sms, recipient.mobile,
                 f"ToppersDeck: your session with {peer_name} is confirmed for {when}."
                 + (f" Join: {url}" if url else ""))


def session_requested(*, order, student, mentor) -> None:
    if not mentor.email:
        return
    subject, html, text = T.session_requested(
        mentor_name=mentor.display_name,
        student_name=(f"Aspirant {order.anon_handle}" if order.is_anonymous
                      else student.display_name),
        title=order.title or "Session", when=pretty(order.start_at),
        subject_line=order.subject or "General strategy",
        agenda=order.agenda or "", amount=rupees(order.amount),
        payout=rupees(order.mentor_payout),
    )
    _run(send_email, mentor.email, subject, html, text)


def session_cancelled(*, order, student, mentor, by_role: str) -> None:
    if not order.start_at:
        return
    when = pretty(order.start_at)
    for recipient, peer, is_mentor in ((student, mentor, False), (mentor, student, True)):
        if not recipient.email:
            continue
        peer_name = (f"Aspirant {order.anon_handle}"
                     if (order.is_anonymous and is_mentor) else peer.display_name)
        # a CANCEL invite with the same UID withdraws the calendar entry
        ics = build_invite(
            uid_seed=f"{order.reference}-{recipient.id}",
            summary=f"ToppersDeck · {order.title} with {peer_name}",
            description="This session was cancelled.", start=order.start_at,
            end=order.end_at, organiser_name=S.MAIL_FROM_NAME,
            organiser_email=S.MAIL_FROM,
            attendees=[(recipient.display_name, recipient.email)],
            method="CANCEL", sequence=1, cancelled=True, reminder_minutes=0,
        )
        subject, html, text = T.session_cancelled(
            peer_name=peer_name, title=order.title or "Session", when=when,
            by_role=by_role, reference=order.reference)
        _run(send_email, recipient.email, subject, html, text, ics, "CANCEL")


def session_reminder(*, order, student, mentor, minutes_away: int) -> None:
    when = pretty(order.start_at)
    for recipient, peer, is_mentor in ((student, mentor, False), (mentor, student, True)):
        if not recipient.email:
            continue
        peer_name = (f"Aspirant {order.anon_handle}"
                     if (order.is_anonymous and is_mentor) else peer.display_name)
        subject, html, text = T.session_reminder(
            to_name=recipient.display_name, peer_name=peer_name,
            title=order.title or "Session", when=when, minutes_away=minutes_away,
            meet_url=order.meeting_link or "")
        _run(send_email, recipient.email, subject, html, text)
        if recipient.mobile:
            _run(send_sms, recipient.mobile,
                 f"ToppersDeck: your session with {peer_name} starts at {when}."
                 + (f" Join: {order.meeting_link}" if order.meeting_link else ""))


# ═════════════════════════════════════════════════ evaluation notifications
def copy_submitted(*, order, student, mentor) -> None:
    if not mentor.email:
        return
    subject, html, text = T.copy_submitted(
        mentor_name=mentor.display_name, student_name=student.display_name,
        count=order.quantity, sla_hours=order.sla_hours,
        deadline=pretty(order.sla_deadline), subject_line=order.subject or "—",
        reference=order.reference)
    _run(send_email, mentor.email, subject, html, text)


def evaluation_ready(*, order, student, mentor) -> None:
    if not student.email:
        return
    marks = (f"{order.marks_awarded:g} / {order.marks_total:g}"
             if order.marks_awarded is not None and order.marks_total else "—")
    subject, html, text = T.evaluation_ready(
        student_name=student.display_name, mentor_name=mentor.display_name,
        subject_line=order.subject or "", marks=marks,
        feedback=order.evaluator_feedback or "", reference=order.reference)
    _run(send_email, student.email, subject, html, text)
    if student.mobile:
        _run(send_sms, student.mobile,
             f"ToppersDeck: {mentor.display_name} returned your evaluated copy "
             f"({order.reference}). Download it from your workspace.")
