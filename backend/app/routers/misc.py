"""Catalog, notifications, student profile, dashboards, earnings, admin."""
from datetime import timedelta

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..catalog import catalog_payload
from ..config import (COMMISSION_RATE, ESCROW_HOLD_HOURS, MEDIA_DIR, PLATFORM_NAME,
                      PLATFORM_TAGLINE, TIMEZONE_LABEL, VAULT_STREAM_DAYS)
from ..db import get_db
from ..escrow import mentor_balances, sweep_once
from ..models import (Dispute, LedgerEntry, MentorProfile, Notification, Order, Review,
                      StudentProfile, Thread, User)
from ..schemas import StudentProfileIn
from ..security import current_user, student_only
from ..serializers import iso, mentor_card, order_out, prime_orders, student_out
from ..timeutil import now_ist
from ..uploads import save_upload

router = APIRouter(prefix="/api", tags=["platform"])


@router.get("/meta")
def meta(db: Session = Depends(get_db)):
    listed = (db.query(MentorProfile)
              .filter(MentorProfile.is_listed == True).all())          # noqa: E712
    delivered = db.query(Order).filter(Order.status.in_(["approved", "delivered", "ready"])).count()
    copies = db.query(Order).filter(Order.service_kind == "offline_eval").count()
    subjects = set()
    for p in listed:
        subjects.update(p.all_subjects)
    ranked = [p for p in listed if p.has_final_rank]
    return {
        "platform": PLATFORM_NAME,
        "tagline": PLATFORM_TAGLINE,
        "timezone": TIMEZONE_LABEL,
        "commission_rate": COMMISSION_RATE,
        "escrow_hours": ESCROW_HOLD_HOURS,
        "vault_stream_days": VAULT_STREAM_DAYS,
        "catalog": catalog_payload(),
        "stats": {
            "mentors": len(listed),
            "rankers": len(ranked),
            "students": db.query(StudentProfile).count(),
            "sessions_delivered": delivered,
            "copies_evaluated": copies,
            "subjects_live": len(subjects),
        },
    }


@router.get("/notifications")
def notifications(unread_only: bool = False, user: User = Depends(current_user),
                  db: Session = Depends(get_db)):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.is_read == False)                    # noqa: E712
    rows = q.order_by(Notification.created_at.desc()).limit(40).all()
    unread = (db.query(Notification)
              .filter(Notification.user_id == user.id,
                      Notification.is_read == False).count())          # noqa: E712
    return {"unread": unread, "results": [
        {"id": n.id, "kind": n.kind, "title": n.title, "body": n.body, "link": n.link,
         "is_read": n.is_read, "created_at": iso(n.created_at)} for n in rows]}


@router.post("/notifications/read")
def mark_read(user: User = Depends(current_user), db: Session = Depends(get_db)):
    (db.query(Notification)
     .filter(Notification.user_id == user.id, Notification.is_read == False)   # noqa: E712
     .update({"is_read": True}))
    db.commit()
    return {"ok": True}


@router.put("/students/me/profile")
def update_student(payload: StudentProfileIn, user: User = Depends(student_only),
                   db: Session = Depends(get_db)):
    profile = user.student
    data = payload.model_dump(exclude_none=True)
    for field in ("display_name", "mobile", "city"):
        if field in data:
            setattr(user, field, data.pop(field))
    for key, value in data.items():
        setattr(profile, key, value)
    db.commit()
    return student_out(profile, user)


@router.post("/students/me/photo")
def update_student_photo(
    file: UploadFile = File(...),
    user: User = Depends(student_only),
    db: Session = Depends(get_db),
):
    user.photo = save_upload(
        file, MEDIA_DIR, "photo", 5, {".jpg", ".jpeg", ".png", ".webp"}
    )
    db.commit()
    return student_out(user.student, user)


@router.get("/dashboard")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    now = now_ist()
    week = now + timedelta(days=7)

    if user.role == "student":
        mine = db.query(Order).filter(Order.student_id == user.id).all()
        prime_orders(db, mine)
        scheduled = [o for o in mine if o.service_kind in ("video_1on1", "live_eval")]
        upcoming = sorted([o for o in scheduled if o.start_at and o.start_at >= now
                           and o.status in ("pending", "confirmed")],
                          key=lambda o: o.start_at)
        evals = [o for o in mine if o.service_kind == "offline_eval"
                 and o.status in ("submitted", "evaluating", "ready")]
        retainers = [o for o in mine if o.service_kind == "retainer" and o.status == "active"]
        awaiting = [o for o in mine if o.status in ("delivered", "ready")]
        spend = sum(o.amount for o in mine
                    if o.escrow_state in ("held", "released", "frozen")
                    and o.status not in ("cancelled", "declined"))
        in_escrow = sum(o.amount for o in mine if o.escrow_state == "held"
                        and o.status not in ("cancelled", "declined"))
        threads = db.query(Thread).filter(Thread.student_id == user.id).all()
        unread = sum(1 for t in threads for m in t.messages
                     if m.sender_id != user.id and m.read_at is None)
        return {
            "role": "student",
            "profile": student_out(user.student, user) if user.student else None,
            "cards": [
                {"label": "Upcoming sessions", "value": len(upcoming), "tone": "indigo",
                 "hint": f"{len([o for o in upcoming if o.start_at <= week])} in the next 7 days"},
                {"label": "Copies in flight", "value": len(evals), "tone": "amber",
                 "hint": f"{len([o for o in evals if o.status == 'ready'])} ready to download"},
                {"label": "Held in escrow", "value": f"₹{in_escrow:,}", "tone": "violet",
                 "hint": f"released {ESCROW_HOLD_HOURS}h after delivery"},
                {"label": "Total invested", "value": f"₹{spend:,}", "tone": "emerald",
                 "hint": f"across {len({o.mentor_id for o in mine})} mentors"},
            ],
            "upcoming": [order_out(o, db, user) for o in upcoming[:4]],
            "evaluations": [order_out(o, db, user) for o in sorted(
                evals, key=lambda o: o.sla_deadline or now)[:4]],
            "retainers": [order_out(o, db, user) for o in retainers],
            "awaiting_approval": [order_out(o, db, user) for o in awaiting[:5]],
            "unread_messages": unread,
        }

    if user.role == "mentor":
        profile = user.mentor
        mine = db.query(Order).filter(Order.mentor_id == user.id).all()
        prime_orders(db, mine)
        pending = sorted([o for o in mine if o.status == "pending"],
                         key=lambda o: o.start_at or now)
        queue = sorted([o for o in mine if o.service_kind == "offline_eval"
                        and o.status in ("submitted", "evaluating")],
                       key=lambda o: o.sla_deadline or now)
        upcoming = sorted([o for o in mine if o.start_at and o.start_at >= now
                           and o.status == "confirmed"], key=lambda o: o.start_at)
        balances = mentor_balances(db, user.id)
        at_risk = [o for o in queue if o.sla_deadline
                   and o.sla_deadline <= now + timedelta(hours=12)]
        threads = db.query(Thread).filter(Thread.mentor_id == user.id).all()
        unread = sum(1 for t in threads for m in t.messages
                     if m.sender_id != user.id and m.read_at is None)
        disputes = [o for o in mine if o.dispute and o.dispute.status == "open"]
        return {
            "role": "mentor",
            "profile": mentor_card(profile, db, owner=True) if profile else None,
            "cards": [
                {"label": "Pending requests", "value": len(pending), "tone": "amber",
                 "hint": "Awaiting your confirmation"},
                {"label": "Copies to evaluate", "value": len(queue), "tone": "indigo",
                 "hint": f"{len(at_risk)} due within 12 hours"},
                {"label": "In escrow", "value": f"₹{balances['in_escrow']:,}", "tone": "violet",
                 "hint": f"₹{balances['clearing_24h']:,} clears in 24h"},
                {"label": "Paid out", "value": f"₹{balances['released']:,}", "tone": "emerald",
                 "hint": f"after {int(COMMISSION_RATE * 100)}% platform fee"},
            ],
            "pending": [order_out(o, db, user) for o in pending[:6]],
            "queue": [order_out(o, db, user) for o in queue[:6]],
            "upcoming": [order_out(o, db, user) for o in upcoming[:4]],
            "disputes": [order_out(o, db, user) for o in disputes],
            "balances": balances,
            "unread_messages": unread,
        }

    raise HTTPException(400, "Unsupported role")


@router.get("/earnings")
def earnings(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "mentor":
        raise HTTPException(403, "Mentors only")
    orders = db.query(Order).filter(Order.mentor_id == user.id).all()
    entries = []
    for o in orders:
        for e in o.ledger:
            entries.append({
                "id": e.id, "order_id": o.id, "reference": o.reference,
                "service_kind": o.service_kind, "kind": e.kind, "amount": e.amount,
                "commission": e.commission, "payout": e.payout, "note": e.note,
                "created_at": iso(e.created_at),
                "student": (f"Aspirant {o.anon_handle}" if o.is_anonymous
                            else (db.get(User, o.student_id).display_name
                                  if db.get(User, o.student_id) else "")),
            })
    entries.sort(key=lambda e: e["created_at"] or "", reverse=True)

    by_service: dict[str, int] = {}
    for o in orders:
        for e in o.ledger:
            if e.kind in ("released", "liquidated"):
                by_service[o.service_kind] = by_service.get(o.service_kind, 0) + e.payout

    return {
        "balances": mentor_balances(db, user.id),
        "commission_rate": COMMISSION_RATE,
        "escrow_hours": ESCROW_HOLD_HOURS,
        "by_service": by_service,
        "ledger": entries[:80],
        "pending_release": [order_out(o, db, user) for o in orders
                            if o.escrow_state == "held" and o.status in ("delivered", "ready")],
    }


@router.get("/admin/notifications")
def notification_status(user: User = Depends(current_user)):
    """What the running process actually loaded. Contains no secrets — only
    which provider is selected, whether credentials are present, and which
    .env files were found."""
    from ..notify import settings as NS
    return NS.status()


@router.post("/admin/sweep")
def manual_sweep(user: User = Depends(current_user)):
    """Run every escrow / SLA / retention rule now instead of waiting for the timer."""
    return sweep_once()
