"""RFC 5545 calendar invites.

Session times are stored as naive IST wall-clock, so everything is converted to
UTC here — otherwise the event lands at the wrong hour in the recipient's
calendar. METHOD:REQUEST is what makes Gmail render the invite with
Yes/No/Maybe buttons instead of showing a bare attachment.
"""
import hashlib
from datetime import datetime, timedelta, timezone

from ..timeutil import IST
from . import settings as S


def _utc(dt: datetime) -> str:
    """Naive IST wall-clock → UTC, in iCalendar basic format."""
    return dt.replace(tzinfo=IST).astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _fold(line: str) -> str:
    """iCalendar lines must not exceed 75 octets."""
    out, current = [], line
    limit = 73
    while len(current.encode()) > limit:
        cut = limit
        while len(current[:cut].encode()) > limit:
            cut -= 1
        out.append(current[:cut])
        current = " " + current[cut:]
    out.append(current)
    return "\r\n".join(out)


def _esc(text: str) -> str:
    return (str(text or "").replace("\\", "\\\\").replace(";", r"\;")
            .replace(",", r"\,").replace("\n", r"\n"))


def build_invite(*, uid_seed: str, summary: str, description: str, start: datetime,
                 end: datetime, organiser_name: str, organiser_email: str,
                 attendees: list[tuple[str, str]], location: str = "",
                 url: str = "", method: str = "REQUEST", sequence: int = 0,
                 cancelled: bool = False, reminder_minutes: int = 30) -> str:
    uid = hashlib.sha1(uid_seed.encode()).hexdigest()[:24] + "@upscnexus"
    now = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//ToppersDeck//Mentorship//EN",
        "CALSCALE:GREGORIAN",
        f"METHOD:{method}",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"SEQUENCE:{sequence}",
        f"DTSTAMP:{now}",
        f"DTSTART:{_utc(start)}",
        f"DTEND:{_utc(end)}",
        f"SUMMARY:{_esc(summary)}",
        f"DESCRIPTION:{_esc(description)}",
        f"STATUS:{'CANCELLED' if cancelled else 'CONFIRMED'}",
        "TRANSP:OPAQUE",
        f"ORGANIZER;CN={_esc(organiser_name)}:mailto:{organiser_email}",
    ]
    if location:
        lines.append(f"LOCATION:{_esc(location)}")
    if url:
        lines.append(f"URL:{url}")
        # Google reads this property to show a "Join" button on the event
        lines.append(f"X-GOOGLE-CONFERENCE:{url}")
    for name, email in attendees:
        lines.append(
            f"ATTENDEE;CN={_esc(name)};ROLE=REQ-PARTICIPANT;"
            f"PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{email}")
    if not cancelled and reminder_minutes:
        lines += [
            "BEGIN:VALARM",
            f"TRIGGER:-PT{reminder_minutes}M",
            "ACTION:DISPLAY",
            f"DESCRIPTION:{_esc(summary)}",
            "END:VALARM",
        ]
    lines += ["END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(_fold(l) for l in lines) + "\r\n"


def google_calendar_link(*, summary: str, description: str, start: datetime,
                         end: datetime, location: str = "") -> str:
    """A one-click 'Add to Google Calendar' URL, for clients that ignore .ics."""
    import urllib.parse
    params = {
        "action": "TEMPLATE",
        "text": summary,
        "dates": f"{_utc(start)}/{_utc(end)}",
        "details": description,
        "location": location,
    }
    return "https://calendar.google.com/calendar/render?" + urllib.parse.urlencode(params)
