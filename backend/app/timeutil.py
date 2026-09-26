"""All class scheduling happens on the IST wall clock, stored naive.

Keeping one helper here means the portal behaves the same no matter what
timezone the host machine is set to.
"""
from datetime import datetime, timedelta, timezone

IST = timezone(timedelta(hours=5, minutes=30))


def now_ist() -> datetime:
    """Current IST wall-clock time as a naive datetime."""
    return datetime.now(IST).replace(tzinfo=None, microsecond=0)


def to_naive_ist(dt: datetime) -> datetime:
    """Normalise an incoming datetime to naive IST wall clock."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(IST).replace(tzinfo=None)
    return dt.replace(microsecond=0)


def parse_hhmm(value: str) -> tuple[int, int]:
    hh, mm = value.split(":")[:2]
    return int(hh), int(mm)
