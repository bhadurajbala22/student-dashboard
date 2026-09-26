"""Mentor discovery plus the seven-screen storefront setup."""
import shutil
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session, selectinload

from ..catalog import DAY_NAMES, SERVICE_KEYS, SERVICES
from ..config import KYC_DIR, MAX_KYC_MB, MEDIA_DIR
from ..db import get_db
from ..models import (AvailabilitySlot, BlackoutDate, MentorProfile, MentorService,
                      Notification, Order, User)
from ..pricing import suggest_rates
from ..schemas import (AgreementsIn, BankIn, BlackoutIn, ExpertiseIn, MentorCredentialsIn,
                       ScheduleIn, ServicesIn)
from ..security import current_user, mentor_only
from ..serializers import iso, mentor_card, onboarding_state, slot_out
from ..timeutil import now_ist, parse_hhmm
from ..uploads import save_upload

router = APIRouter(prefix="/api", tags=["mentors"])

SORTS = {
    "recommended": lambda p: (-(p.rating or 0), -p.orders_completed),
    "rating": lambda p: (-(p.rating or 0), -p.rating_count),
    "price_low": lambda p: min([s.price for s in p.services if s.is_active and s.price] or [10**6]),
    "price_high": lambda p: -max([s.price for s in p.services if s.is_active and s.price] or [0]),
    "experience": lambda p: -p.teaching_years,
    "selections": lambda p: -p.selections_produced,
}


# ------------------------------------------------------------ availability
def _busy_many(db: Session, mentor_user_ids: list[int]) -> dict[int, list[tuple[datetime, datetime]]]:
    """Busy intervals for several mentors in one query.

    The per-mentor version below costs one round trip each, which is free on
    SQLite and ruinous over a network — the discovery page alone was issuing one
    per listed mentor.
    """
    out: dict[int, list[tuple[datetime, datetime]]] = {i: [] for i in mentor_user_ids}
    if not mentor_user_ids:
        return out
    rows = (db.query(Order)
            .filter(Order.mentor_id.in_(mentor_user_ids),
                    Order.service_kind.in_(["video_1on1", "live_eval"]),
                    Order.status.in_(["pending", "confirmed"]))
            .all())
    for o in rows:
        if o.start_at and o.end_at:
            out.setdefault(o.mentor_id, []).append((o.start_at, o.end_at))
    return out


def _busy(db: Session, mentor_user_id: int) -> list[tuple[datetime, datetime]]:
    return _busy_many(db, [mentor_user_id])[mentor_user_id]


def expand_slots(profile: MentorProfile, db: Session, days: int = 14,
                 granularity: int = 30,
                 busy: list[tuple[datetime, datetime]] | None = None) -> list[dict]:
    """Turn the weekly green blocks into concrete bookable 30-minute units.

    `busy` lets a caller listing many mentors fetch every booking up front
    instead of one query per mentor.
    """
    busy = _busy(db, profile.user_id) if busy is None else busy
    blackouts = {b.date for b in profile.blackouts}
    now = now_ist()
    out: list[dict] = []

    for offset in range(days):
        date = (now + timedelta(days=offset)).date()
        if date.isoformat() in blackouts:
            continue
        dow = date.weekday()
        windows = [s for s in profile.slots if s.is_active and s.day_of_week == dow]
        units = []
        for w in windows:
            sh, sm = parse_hhmm(w.start_time)
            eh, em = parse_hhmm(w.end_time)
            cursor = datetime(date.year, date.month, date.day, sh, sm)
            end = datetime(date.year, date.month, date.day, eh, em)
            step = timedelta(minutes=granularity)
            while cursor + step <= end:
                slot_end = cursor + step
                taken = any(cursor < b_end and slot_end > b_start for b_start, b_end in busy)
                if cursor > now + timedelta(minutes=30):
                    units.append({
                        "start_at": iso(cursor),
                        "end_at": iso(slot_end),
                        "label": cursor.strftime("%I:%M %p").lstrip("0"),
                        "minutes": granularity,
                        "booked": taken,
                    })
                cursor = slot_end
        if units:
            units.sort(key=lambda u: u["start_at"])
            out.append({
                "date": date.isoformat(),
                "day_name": DAY_NAMES[dow],
                "day_type": "weekend" if dow >= 5 else "weekday",
                "pretty": date.strftime("%d %b"),
                "slots": units,
                "open_count": sum(1 for u in units if not u["booked"]),
            })
    return out


def next_available(profile: MentorProfile, db: Session,
                   busy: list[tuple[datetime, datetime]] | None = None) -> str | None:
    for day in expand_slots(profile, db, days=10, busy=busy):
        for slot in day["slots"]:
            if not slot["booked"]:
                return slot["start_at"]
    return None


# ---------------------------------------------------------------- discovery
@router.get("/mentors")
def list_mentors(
    db: Session = Depends(get_db),
    q: str = "",
    service: str = "",
    subject: str = "",
    category: str = "",
    language: str = "",
    optional_subject: str = "",
    min_price: int = 0,
    max_price: int = 0,
    min_rating: float = 0,
    availability: str = "",          # today | week | anytime
    verified_only: bool = False,
    sort: str = "recommended",
):
    # Without these the card serializer lazy-loads user/services/slots/blackouts
    # for every mentor — four round trips each, which a remote database charges
    # real latency for. selectinload fetches each relationship in one extra
    # query no matter how many mentors come back.
    profiles = (db.query(MentorProfile)
                .join(User, User.id == MentorProfile.user_id)
                .options(selectinload(MentorProfile.user),
                         selectinload(MentorProfile.services),
                         selectinload(MentorProfile.slots),
                         selectinload(MentorProfile.blackouts))
                .filter(User.is_active == True,                       # noqa: E712
                        MentorProfile.is_listed == True)              # noqa: E712
                .all())

    now = now_ist()
    horizon = {"today": 1, "week": 7}.get(availability)
    cache: dict[int, str | None] = {}
    busy_by_mentor = _busy_many(db, [p.user_id for p in profiles])

    def price_of(p: MentorProfile) -> list[int]:
        return [s.price for s in p.services if s.is_active and s.price > 0
                and (not service or s.kind == service)]

    def keep(p: MentorProfile) -> bool:
        if service and not any(s.kind == service and s.is_active and s.price > 0
                               for s in p.services):
            return False
        if category and p.category != category:
            return False
        if subject and subject not in p.all_subjects:
            return False
        if optional_subject and optional_subject not in (p.optional_subjects or []):
            return False
        if language and language not in (p.languages or []):
            return False
        if min_rating and p.rating < min_rating:
            return False
        if verified_only and p.verification_status != "verified":
            return False
        prices = price_of(p)
        if min_price and (not prices or max(prices) < min_price):
            return False
        if max_price and (not prices or min(prices) > max_price):
            return False
        if q:
            needle = q.lower()
            hay = " ".join([p.user.display_name, p.headline or "", p.philosophy or "",
                            p.university or "", " ".join(p.all_subjects),
                            " ".join(p.optional_subjects or []), p.user.city or "",
                            p.highest_qualification or ""]).lower()
            if needle not in hay:
                return False
        if horizon:
            nxt = cache.get(p.id)
            if p.id not in cache:
                nxt = next_available(p, db, busy=busy_by_mentor.get(p.user_id, []))
                cache[p.id] = nxt
            if not nxt:
                return False
            if datetime.fromisoformat(nxt) > now + timedelta(days=horizon):
                return False
        return True

    filtered = [p for p in profiles if keep(p)]
    filtered.sort(key=SORTS.get(sort, SORTS["recommended"]))

    results = []
    for p in filtered:
        card = mentor_card(p, db)
        nxt = (cache.get(p.id) if p.id in cache
               else next_available(p, db, busy=busy_by_mentor.get(p.user_id, [])))
        card["next_available"] = nxt
        results.append(card)

    return {"count": len(results), "total": len(profiles), "results": results}


@router.get("/mentors/{user_id}")
def mentor_detail(user_id: int, db: Session = Depends(get_db)):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(404, "Mentor not found")
    data = mentor_card(profile, db, full=True)
    data["next_available"] = next_available(profile, db)
    return data


@router.get("/mentors/{user_id}/slots")
def mentor_slots(user_id: int, days: int = Query(21, ge=1, le=45),
                 db: Session = Depends(get_db)):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(404, "Mentor not found")
    return {
        "mentor_id": user_id,
        "timezone": "IST",
        "days": expand_slots(profile, db, days=days),
        "blackouts": [{"date": b.date, "reason": b.reason} for b in profile.blackouts],
    }


# --------------------------------------------------- storefront setup (me)
@router.get("/mentors/me/profile")
def my_profile(user: User = Depends(mentor_only), db: Session = Depends(get_db)):
    return mentor_card(user.mentor, db, owner=True)


@router.put("/mentors/me/credentials")
def save_credentials(payload: MentorCredentialsIn, user: User = Depends(mentor_only),
                     db: Session = Depends(get_db)):
    profile = user.mentor
    data = payload.model_dump(exclude_none=True)
    for field in ("display_name", "city"):
        if field in data:
            setattr(user, field, data.pop(field))
    for key, value in data.items():
        setattr(profile, key, value)

    # a Mains/interview claim without proof cannot be advertised
    if profile.mains_cleared_years and not profile.mains_marksheet:
        profile.verification_note = "Mains marksheet still required."
    db.commit()
    return mentor_card(profile, db, owner=True)


def _save_upload(file: UploadFile, folder: Path, prefix: str, max_mb: int,
                 allowed: set[str] | None = None) -> str:
    return save_upload(file, folder, prefix, max_mb, allowed)


@router.post("/mentors/me/kyc")
def save_kyc(
    aadhaar_number: str = Form(""),
    pan_number: str = Form(""),
    bank_holder: str = Form(""),
    bank_account: str = Form(""),
    bank_account_confirm: str = Form(""),
    bank_ifsc: str = Form(""),
    bank_type: str = Form("Savings"),
    aadhaar_front: UploadFile | None = File(None),
    aadhaar_back: UploadFile | None = File(None),
    pan_doc: UploadFile | None = File(None),
    bank_proof: UploadFile | None = File(None),
    user: User = Depends(mentor_only),
    db: Session = Depends(get_db),
):
    """Store masked identifiers only — the raw Aadhaar/account numbers are never
    written to the database. Documents land in a private folder for admin review."""
    profile = user.mentor

    if aadhaar_number:
        digits = "".join(c for c in aadhaar_number if c.isdigit())
        if len(digits) != 12:
            raise HTTPException(400, "Aadhaar must be 12 digits")
        profile.aadhaar_masked = f"XXXX XXXX {digits[-4:]}"
    if pan_number:
        pan = pan_number.strip().upper()
        if len(pan) != 10:
            raise HTTPException(400, "PAN must be 10 characters")
        profile.pan_masked = f"{pan[:3]}XXXX{pan[-1]}"
    if bank_account:
        if bank_account != bank_account_confirm:
            raise HTTPException(400, "The two account numbers do not match")
        acct = "".join(c for c in bank_account if c.isdigit())
        if len(acct) < 8:
            raise HTTPException(400, "That account number looks too short")
        profile.bank_account_masked = f"{'X' * (len(acct) - 4)}{acct[-4:]}"
    if bank_holder:
        profile.bank_holder = bank_holder
    if bank_ifsc:
        profile.bank_ifsc = bank_ifsc.strip().upper()
    if bank_type:
        profile.bank_type = bank_type

    for field, upload in (("aadhaar_front", aadhaar_front), ("aadhaar_back", aadhaar_back),
                          ("pan_doc", pan_doc), ("bank_proof", bank_proof)):
        if upload and upload.filename:
            setattr(profile, field, _save_upload(upload, KYC_DIR, field, MAX_KYC_MB))

    db.commit()
    return mentor_card(profile, db, owner=True)


@router.post("/mentors/me/proof")
def upload_proof(
    kind: str = Form(...),          # mains_marksheet | interview_admit_card | photo | intro_video
    file: UploadFile = File(...),
    user: User = Depends(mentor_only),
    db: Session = Depends(get_db),
):
    profile = user.mentor
    if kind in ("mains_marksheet", "interview_admit_card"):
        stored = _save_upload(file, KYC_DIR, kind, MAX_KYC_MB)
        setattr(profile, kind, stored)
    elif kind == "photo":
        user.photo = _save_upload(
            file, MEDIA_DIR, "photo", 5, {".jpg", ".jpeg", ".png", ".webp"}
        )
    elif kind == "intro_video":
        profile.intro_video = _save_upload(
            file, MEDIA_DIR, "intro", 50, {".mp4", ".webm", ".mov"}
        )
    else:
        raise HTTPException(400, f"Unknown proof type '{kind}'")
    db.commit()
    return mentor_card(profile, db, owner=True)


@router.put("/mentors/me/services")
def save_services(payload: ServicesIn, user: User = Depends(mentor_only),
                  db: Session = Depends(get_db)):
    profile = user.mentor
    existing = {s.kind: s for s in profile.services}
    for item in payload.services:
        if item.kind not in SERVICE_KEYS:
            raise HTTPException(400, f"Unknown service '{item.kind}'")
        svc = existing.get(item.kind)
        if not svc:
            svc = MentorService(mentor_id=profile.id, kind=item.kind)
            db.add(svc)
        if item.is_active and item.price < 10:
            raise HTTPException(400, f"{SERVICES[item.kind]['label']} needs a price of at least ₹10")
        svc.is_active = item.is_active
        svc.price = item.price
        svc.session_tags = item.session_tags
        svc.sla_hours = item.sla_hours
        svc.package_title = item.package_title
        svc.deliverables = item.deliverables
        svc.session_credits = item.session_credits
        svc.eval_credits = item.eval_credits
        svc.validity_days = item.validity_days or 30
    db.commit()
    return mentor_card(profile, db, owner=True)


@router.put("/mentors/me/expertise")
def save_expertise(payload: ExpertiseIn, user: User = Depends(mentor_only),
                   db: Session = Depends(get_db)):
    profile = user.mentor
    profile.expertise = {k: v for k, v in payload.expertise.items() if v}
    profile.optional_subjects = payload.optional_subjects
    db.commit()
    return mentor_card(profile, db, owner=True)


@router.put("/mentors/me/schedule")
def save_schedule(payload: ScheduleIn, user: User = Depends(mentor_only),
                  db: Session = Depends(get_db)):
    profile = user.mentor
    if payload.max_daily_copies is not None:
        profile.max_daily_copies = max(0, payload.max_daily_copies)
    if payload.slots is not None:
        wanted = {(s.day_of_week, s.start_time, s.end_time) for s in payload.slots}
        for slot in list(profile.slots):
            if (slot.day_of_week, slot.start_time, slot.end_time) not in wanted:
                db.delete(slot)
        have = {(s.day_of_week, s.start_time, s.end_time) for s in profile.slots}
        for s in payload.slots:
            key = (s.day_of_week, s.start_time, s.end_time)
            if key in have:
                continue
            db.add(AvailabilitySlot(
                mentor_id=profile.id, day_of_week=s.day_of_week,
                day_type="weekend" if s.day_of_week >= 5 else "weekday",
                start_time=s.start_time, end_time=s.end_time,
            ))
    db.commit()
    db.refresh(profile)
    return mentor_card(profile, db, owner=True)


@router.post("/mentors/me/blackouts")
def add_blackout(payload: BlackoutIn, user: User = Depends(mentor_only),
                 db: Session = Depends(get_db)):
    profile = user.mentor
    if db.query(BlackoutDate).filter(BlackoutDate.mentor_id == profile.id,
                                     BlackoutDate.date == payload.date).first():
        raise HTTPException(400, "That date is already blocked")
    db.add(BlackoutDate(mentor_id=profile.id, date=payload.date, reason=payload.reason))
    db.commit()
    db.refresh(profile)
    return mentor_card(profile, db, owner=True)


@router.delete("/mentors/me/blackouts/{date}")
def remove_blackout(date: str, user: User = Depends(mentor_only),
                    db: Session = Depends(get_db)):
    row = (db.query(BlackoutDate)
           .filter(BlackoutDate.mentor_id == user.mentor.id, BlackoutDate.date == date).first())
    if row:
        db.delete(row)
        db.commit()
    db.refresh(user.mentor)
    return mentor_card(user.mentor, db, owner=True)


@router.post("/mentors/me/submit")
def submit_for_review(payload: AgreementsIn, user: User = Depends(mentor_only),
                      db: Session = Depends(get_db)):
    profile = user.mentor
    if not all([payload.agreed_escrow, payload.agreed_sla, payload.agreed_nda,
                payload.agreed_commission]):
        raise HTTPException(400, "All four platform agreements must be accepted")

    state = onboarding_state(profile)
    missing = [k for k, v in state["steps"].items() if not v and k != "agreements"]
    if missing:
        raise HTTPException(400, "Finish these first: " + ", ".join(missing))

    profile.agreed_escrow = profile.agreed_sla = True
    profile.agreed_nda = profile.agreed_commission = True
    profile.verification_status = "submitted"
    profile.submitted_at = now_ist()
    db.add(Notification(
        user_id=user.id, kind="info", link="onboarding",
        title="Profile submitted for verification",
        body="Our team reviews government IDs and UPSC marksheets. This takes 24–48 hours.",
    ))
    db.commit()
    return mentor_card(profile, db, owner=True)


@router.post("/mentors/me/simulate-review")
def simulate_review(user: User = Depends(mentor_only), db: Session = Depends(get_db)):
    """Demo shortcut: stands in for the manual admin verification queue so the
    rest of the flow can be explored without a second admin login."""
    profile = user.mentor
    if profile.verification_status not in ("submitted", "in_review"):
        raise HTTPException(400, "Submit your profile for verification first")
    profile.verification_status = "verified"
    profile.verified_at = now_ist()
    profile.is_listed = True
    db.add(Notification(
        user_id=user.id, kind="success", link="dashboard",
        title="You're verified and live",
        body="Your storefront is now discoverable by aspirants.",
    ))
    db.commit()
    return mentor_card(profile, db, owner=True)


@router.post("/mentors/me/listing")
def toggle_listing(user: User = Depends(mentor_only), db: Session = Depends(get_db)):
    profile = user.mentor
    if profile.verification_status != "verified":
        raise HTTPException(400, "Only verified mentors can appear in discovery")
    profile.is_listed = not profile.is_listed
    db.commit()
    return mentor_card(profile, db, owner=True)


@router.post("/rate-guidance")
def rate_guidance(payload: dict):
    """Live pricing reference used by the storefront step as the mentor types."""
    return suggest_rates(payload or {})
