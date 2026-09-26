"""Model → dict helpers. Anonymous-mode masking lives here so no route can leak."""
from datetime import datetime

from sqlalchemy.orm import Session

from .catalog import DAY_NAMES, SERVICE_KEYS, SERVICES
from .config import ESCROW_HOLD_HOURS, VAULT_STREAM_DAYS
from .models import Message, Order, Recording, Review, Thread, User
from .timeutil import now_ist


def _service_rank(kind: str) -> int:
    """Canonical storefront order: video, copy checking, live review, retainer."""
    return SERVICE_KEYS.index(kind) if kind in SERVICE_KEYS else len(SERVICE_KEYS)


def iso(dt: datetime | None) -> str | None:
    return dt.replace(microsecond=0).isoformat() if dt else None


def user_brief(user: User | None) -> dict | None:
    if not user:
        return None
    return {
        "id": user.id,
        "name": user.display_name,
        "legal_name": user.legal_name,
        "role": user.role,
        "city": user.city,
        "initials": user.initials,
        "hue": user.avatar_hue,
        "anonymous": False,
    }


def masked_student(order: Order) -> dict:
    """What a mentor sees when the student booked in Anonymous Mode."""
    return {
        "id": None,
        "name": f"Aspirant {order.anon_handle}",
        "legal_name": "",
        "role": "student",
        "city": "",
        "initials": "A?",
        "hue": 220,
        "anonymous": True,
    }


# ------------------------------------------------------------------ mentor
def service_out(svc) -> dict:
    meta = SERVICES.get(svc.kind, {})
    return {
        "kind": svc.kind,
        "label": meta.get("label", svc.kind),
        "short": meta.get("short", ""),
        "unit": meta.get("unit", ""),
        "unit_minutes": meta.get("unit_minutes", 0),
        "blurb": meta.get("blurb", ""),
        "is_active": svc.is_active,
        "price": svc.price,
        "session_tags": svc.session_tags or [],
        "sla_hours": svc.sla_hours,
        "package_title": svc.package_title,
        "deliverables": svc.deliverables,
        "session_credits": svc.session_credits,
        "eval_credits": svc.eval_credits,
        "validity_days": svc.validity_days,
    }


def slot_out(slot) -> dict:
    return {
        "id": slot.id,
        "day_of_week": slot.day_of_week,
        "day_name": DAY_NAMES[slot.day_of_week],
        "day_type": slot.day_type,
        "start_time": slot.start_time,
        "end_time": slot.end_time,
        "is_active": slot.is_active,
    }


def mentor_card(profile, db: Session | None = None, full: bool = False,
                owner: bool = False) -> dict:
    u = profile.user
    active = [s for s in profile.services if s.is_active and s.price > 0]
    prices = {s.kind: s.price for s in active}
    data = {
        "id": u.id,
        "profile_id": profile.id,
        "name": u.display_name,
        "initials": u.initials,
        "hue": u.avatar_hue,
        "photo": u.photo,
        "city": u.city or "Remote",
        "category": profile.category,
        "headline": profile.headline,
        "languages": profile.languages or [],
        "employment_status": profile.employment_status,
        "has_final_rank": profile.has_final_rank,
        "final_rank": profile.final_rank,
        "service_allocated": profile.service_allocated,
        "batch_year": profile.batch_year,
        "prelims_cleared_years": profile.prelims_cleared_years or [],
        "mains_cleared_years": profile.mains_cleared_years or [],
        "interview_years": profile.interview_years or [],
        "total_attempts": profile.total_attempts,
        "highest_qualification": profile.highest_qualification,
        "university": profile.university,
        "teaching_years": profile.teaching_years,
        "online_teaching_years": profile.online_teaching_years,
        "students_mentored": profile.students_mentored,
        "selections_produced": profile.selections_produced,
        "subjects": profile.all_subjects,
        "optional_subjects": profile.optional_subjects or [],
        "rating": profile.rating,
        "rating_count": profile.rating_count,
        "orders_completed": profile.orders_completed,
        "response_hours": profile.response_hours,
        "verification_status": profile.verification_status,
        "is_verified": profile.verification_status == "verified",
        "is_listed": profile.is_listed,
        "intro_video": profile.intro_video,
        "prices": prices,
        "service_kinds": [s.kind for s in active],
        "session_tags": next((s.session_tags or [] for s in active if s.kind == "video_1on1"), []),
        "sla_hours": next((s.sla_hours for s in active if s.kind == "offline_eval"), None),
        "slot_count": len([s for s in profile.slots if s.is_active]),
        "badges": _badges(profile),
    }
    if full or owner:
        data.update({
            "philosophy": profile.philosophy,
            "other_credentials": profile.other_credentials,
            "expertise": profile.expertise or {},
            "services": [service_out(s) for s in sorted(
                profile.services, key=lambda s: _service_rank(s.kind))],
            "availability": [slot_out(s) for s in sorted(profile.slots,
                                                         key=lambda s: (s.day_of_week, s.start_time))],
            "blackouts": [{"date": b.date, "reason": b.reason} for b in profile.blackouts],
            "max_daily_copies": profile.max_daily_copies,
        })
    if full and db is not None:
        reviews = (db.query(Review).filter(Review.mentor_id == u.id)
                   .order_by(Review.created_at.desc()).limit(10).all())
        out = []
        for r in reviews:
            order = r.order
            anon = bool(order and order.is_anonymous)
            student = db.get(User, r.student_id)
            out.append({
                "id": r.id, "rating": r.rating, "comment": r.comment,
                "created_at": iso(r.created_at),
                "student": f"Aspirant {order.anon_handle}" if anon else (
                    student.display_name if student else "Aspirant"),
                "service": SERVICES.get(order.service_kind, {}).get("short", "") if order else "",
            })
        data["reviews"] = out
    if owner:
        data.update({
            "legal_name": u.legal_name,
            "email": u.email,
            "mobile": u.mobile,
            "email_verified": u.email_verified,
            "mobile_verified": u.mobile_verified,
            "aadhaar_masked": profile.aadhaar_masked,
            "pan_masked": profile.pan_masked,
            "bank_holder": profile.bank_holder,
            "bank_account_masked": profile.bank_account_masked,
            "bank_ifsc": profile.bank_ifsc,
            "bank_type": profile.bank_type,
            "kyc_docs": {
                "aadhaar_front": bool(profile.aadhaar_front),
                "aadhaar_back": bool(profile.aadhaar_back),
                "pan_doc": bool(profile.pan_doc),
                "bank_proof": bool(profile.bank_proof),
                "mains_marksheet": bool(profile.mains_marksheet),
                "interview_admit_card": bool(profile.interview_admit_card),
            },
            "agreements": {
                "escrow": profile.agreed_escrow, "sla": profile.agreed_sla,
                "nda": profile.agreed_nda, "commission": profile.agreed_commission,
            },
            "verification_note": profile.verification_note,
            "submitted_at": iso(profile.submitted_at),
            "verified_at": iso(profile.verified_at),
            "onboarding": onboarding_state(profile),
        })
    return data


def _badges(profile) -> list[dict]:
    out: list[dict] = []
    if profile.has_final_rank and profile.final_rank:
        out.append({"label": f"AIR {profile.final_rank} · {profile.service_allocated or 'CSE'}",
                    "tone": "rank"})
    for year in sorted(profile.mains_cleared_years or [], reverse=True)[:1]:
        out.append({"label": f"Mains Cleared '{str(year)[-2:]}", "tone": "verified"})
    for year in sorted(profile.interview_years or [], reverse=True)[:1]:
        out.append({"label": f"Interview '{str(year)[-2:]}", "tone": "verified"})
    if profile.category == "faculty":
        out.append({"label": "Faculty", "tone": "faculty"})
    if profile.verification_status == "verified":
        out.append({"label": "ID Verified", "tone": "kyc"})
    return out


def onboarding_state(profile) -> dict:
    """Which of the 7 setup screens are done — drives the progress rail."""
    u = profile.user
    services_on = [s for s in profile.services if s.is_active and s.price > 0]
    expertise_count = sum(len(v or []) for v in (profile.expertise or {}).values())
    steps = {
        "account": bool(u.email_verified or u.mobile_verified),
        "kyc": bool(profile.aadhaar_masked and profile.pan_masked and profile.bank_account_masked),
        "credentials": bool(profile.category and profile.philosophy and profile.highest_qualification),
        "services": bool(services_on),
        "expertise": expertise_count > 0,
        "schedule": bool(profile.slots) or not any(s.kind in ("video_1on1", "live_eval")
                                                   for s in services_on),
        "agreements": all([profile.agreed_escrow, profile.agreed_sla,
                           profile.agreed_nda, profile.agreed_commission]),
    }
    done = sum(1 for v in steps.values() if v)
    return {"steps": steps, "done": done, "total": len(steps),
            "percent": round(done / len(steps) * 100)}


def student_out(profile, user: User) -> dict:
    return {
        "id": user.id,
        "name": user.display_name,
        "email": user.email,
        "mobile": user.mobile,
        "city": user.city,
        "initials": user.initials,
        "hue": user.avatar_hue,
        "target_year": profile.target_year,
        "previous_attempts": profile.previous_attempts,
        "optional_subject": profile.optional_subject,
        "preparation_stages": profile.preparation_stages or [],
        "biggest_hurdle": profile.biggest_hurdle,
        "graduation": profile.graduation,
        "languages": profile.languages or [],
        "budget_per_session": profile.budget_per_session,
    }


# --------------------------------------------------------------- vault
def recording_out(rec: Recording) -> dict:
    now = now_ist()
    remaining = (rec.expires_at - now).total_seconds()
    return {
        "id": rec.id,
        "order_id": rec.order_id,
        "label": rec.label,
        "content_type": rec.content_type,
        "size_mb": round(rec.size_bytes / (1024 * 1024), 2) if rec.size_bytes else 0,
        "duration_seconds": rec.duration_seconds,
        "notes": rec.notes,
        "status": rec.status,
        "uploaded_at": iso(rec.uploaded_at),
        "expires_at": iso(rec.expires_at),
        "purge_at": iso(rec.purge_at),
        "archived_at": iso(rec.archived_at),
        "purged_at": iso(rec.purged_at),
        "days_left": max(0, round(remaining / 86400, 1)) if rec.status == "available" else 0,
        "hours_left": max(0, int(remaining // 3600)) if rec.status == "available" else 0,
        "stream_days": VAULT_STREAM_DAYS,
        "streamable": rec.status == "available",
        "downloadable": False,       # vault policy: neither party may download
    }


# --------------------------------------------------------------- orders
ORDER_LABEL = {
    "pending": "Awaiting mentor",
    "confirmed": "Confirmed",
    "delivered": "Delivered · in escrow",
    "approved": "Completed",
    "declined": "Declined",
    "cancelled": "Cancelled",
    "submitted": "Sent to mentor",
    "evaluating": "Mentor evaluating",
    "ready": "Evaluation ready",
    "refunded_sla": "Refunded · SLA missed",
    "disputed": "Under dispute",
    "active": "Active",
    "expired": "Expired",
}


def prime_orders(db: Session, orders) -> None:
    """Pre-load everything order_out() will ask for, in two queries.

    order_out() calls db.get(User, ...) twice per order and touches the
    dispute/review/recordings relationships. db.get() consults the session's
    identity map first, so loading the users in one go makes those lookups free
    — the difference between 4 round trips per order and none. Harmless on
    SQLite; the difference between 5 seconds and one over a network.
    """
    from sqlalchemy.orm import selectinload

    rows = list(orders)
    # Priming costs a fixed handful of queries, so on a short list it is a net
    # loss — one order genuinely is cheaper loaded lazily. Only pay for it once
    # there is enough to amortise.
    if len(rows) < 3:
        return
    ids = {o.student_id for o in rows} | {o.mentor_id for o in rows}
    db.query(User).filter(User.id.in_(ids)).all()
    (db.query(Order)
       .options(selectinload(Order.dispute), selectinload(Order.review),
                selectinload(Order.recordings))
       .filter(Order.id.in_([o.id for o in rows])).all())


def order_out(o: Order, db: Session, viewer: User | None = None) -> dict:
    student = db.get(User, o.student_id)
    mentor = db.get(User, o.mentor_id)
    viewer_is_mentor = viewer is not None and viewer.id == o.mentor_id
    hide = o.is_anonymous and viewer_is_mentor

    now = now_ist()
    sla_left = ((o.sla_deadline - now).total_seconds() / 3600) if o.sla_deadline else None
    release_left = ((o.auto_release_at - now).total_seconds() / 3600) if o.auto_release_at else None
    meta = SERVICES.get(o.service_kind, {})

    data = {
        "id": o.id,
        "reference": o.reference,
        "service_kind": o.service_kind,
        "service_label": meta.get("label", o.service_kind),
        "service_short": meta.get("short", ""),
        "student": masked_student(o) if hide else user_brief(student),
        "mentor": user_brief(mentor),
        "title": o.title,
        "subject": o.subject,
        "agenda": o.agenda,
        "quantity": o.quantity,
        "unit_price": o.unit_price,
        "amount": o.amount,
        "commission_amount": o.commission_amount,
        "mentor_payout": o.mentor_payout,
        "paid_with_credit": o.paid_with_credit,
        "is_anonymous": o.is_anonymous,
        "anon_handle": o.anon_handle,
        "status": o.status,
        "status_label": ORDER_LABEL.get(o.status, o.status),
        "escrow_state": o.escrow_state,
        "created_at": iso(o.created_at),
        "delivered_at": iso(o.delivered_at),
        "auto_release_at": iso(o.auto_release_at),
        "released_at": iso(o.released_at),
        "hours_to_release": round(release_left, 1) if release_left and release_left > 0 else 0,
        "escrow_window_hours": ESCROW_HOLD_HOURS,
        "mentor_note": o.mentor_note,
        "cancelled_by": o.cancelled_by,
        "can_dispute": (o.escrow_state == "held" and o.status in ("delivered", "ready")
                        and o.dispute is None),
        "review": ({"rating": o.review.rating, "comment": o.review.comment}
                   if o.review else None),
        "dispute": ({"reason": o.dispute.reason, "detail": o.dispute.detail,
                     "status": o.dispute.status, "created_at": iso(o.dispute.created_at),
                     "resolution_note": o.dispute.resolution_note}
                    if o.dispute else None),
    }

    if o.service_kind == "live_eval":
        data.update({
            "upload_name": o.upload_name,
            "has_upload": bool(o.upload_stored),
            "annotations": o.annotations or [],
            "annotation_count": len(o.annotations or []),
            "annotations_updated_at": iso(o.annotations_updated_at),
            "evaluator_feedback": o.evaluator_feedback,
            "marks_awarded": o.marks_awarded,
            "marks_total": o.marks_total,
        })

    if o.is_scheduled:
        starts_in = ((o.start_at - now).total_seconds() / 60) if o.start_at else None
        data.update({
            "start_at": iso(o.start_at),
            "end_at": iso(o.end_at),
            "duration_minutes": o.duration_minutes,
            "meeting_link": o.meeting_link,
            "minutes_to_start": round(starts_in) if starts_in is not None else None,
            # the join button goes live five minutes before the session
            "join_open": (starts_in is not None and -90 <= starts_in <= 5
                          and o.status == "confirmed"),
            "recordings": [recording_out(r) for r in o.recordings if r.status != "purged"],
        })

    if o.service_kind == "offline_eval":
        data.update({
            "upload_name": o.upload_name,
            "has_upload": bool(o.upload_stored),
            "sla_hours": o.sla_hours,
            "sla_deadline": iso(o.sla_deadline),
            "sla_hours_left": round(sla_left, 1) if sla_left is not None else None,
            "sla_breached": sla_left is not None and sla_left < 0,
            "returned_name": o.returned_name,
            "has_return": bool(o.returned_stored),
            "evaluator_feedback": o.evaluator_feedback,
            "annotations": o.annotations or [],
            "annotation_count": len(o.annotations or []),
            "annotations_updated_at": iso(o.annotations_updated_at),
            "marks_awarded": o.marks_awarded,
            "marks_total": o.marks_total,
            "progress": {"submitted": True,
                         "evaluating": o.status in ("evaluating", "ready", "approved", "disputed"),
                         "ready": o.status in ("ready", "approved", "disputed")},
        })

    if o.service_kind == "retainer":
        left = ((o.valid_until - now).days) if o.valid_until else 0
        data.update({
            "package_title": o.package_title,
            "deliverables": o.deliverables,
            "session_credits_total": o.session_credits_total,
            "session_credits_used": o.session_credits_used,
            "session_credits_left": o.session_credits_total - o.session_credits_used,
            "eval_credits_total": o.eval_credits_total,
            "eval_credits_used": o.eval_credits_used,
            "eval_credits_left": o.eval_credits_total - o.eval_credits_used,
            "valid_until": iso(o.valid_until),
            "days_left": max(0, left),
        })

    return data


# ----------------------------------------------------------------- chat
def message_out(m: Message) -> dict:
    return {
        "id": m.id, "thread_id": m.thread_id, "sender_id": m.sender_id,
        "body": m.body, "attachment": m.attachment,
        "created_at": iso(m.created_at), "read_at": iso(m.read_at),
    }


def thread_out(t: Thread, db: Session, me: User) -> dict:
    peer_id = t.mentor_id if me.id == t.student_id else t.student_id
    peer = db.get(User, peer_id)
    msgs = t.messages
    last = msgs[-1] if msgs else None
    peer_profile = peer.mentor if peer and peer.role == "mentor" else None
    return {
        "id": t.id,
        "peer": user_brief(peer),
        "peer_response_hours": peer_profile.response_hours if peer_profile else None,
        "last_message": last.body if last else "",
        "last_message_at": iso(t.last_message_at),
        "last_sender_id": last.sender_id if last else None,
        "unread": sum(1 for m in msgs if m.sender_id != me.id and m.read_at is None),
        "message_count": len(msgs),
    }


def notification_out(n) -> dict:
    return {"id": n.id, "kind": n.kind, "title": n.title, "body": n.body,
            "link": n.link, "is_read": n.is_read, "created_at": iso(n.created_at)}
