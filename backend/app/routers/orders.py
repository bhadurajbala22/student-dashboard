"""The transaction core: booking, delivery, escrow release, disputes, reviews."""
import random
import string
import uuid
from datetime import timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..catalog import SERVICES
from ..config import COMMISSION_RATE, COPIES_DIR, ESCROW_HOLD_HOURS, MAX_PDF_MB
from ..db import get_db
from ..escrow import capture, freeze, mark_delivered, notify, refund, release
from .. import notify as mail
from ..models import (Dispute, MentorProfile, MentorService, Order, Review, Thread, User)
from ..pricing import split_amount
from ..schemas import (AnnotationsIn, DecisionIn, DisputeIn, EvaluationReturnIn,
                       ResolveDisputeIn, ReviewIn, RetainerOrderIn, VideoOrderIn)
from ..security import current_user, mentor_only, student_only
from ..serializers import prime_orders, order_out
from ..timeutil import now_ist, parse_hhmm, to_naive_ist

router = APIRouter(prefix="/api/orders", tags=["orders"])


def _reference() -> str:
    return "NX-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


def _anon_handle() -> str:
    return "#" + "".join(random.choices("ABCDEF0123456789", k=4))


def _service_or_404(db: Session, mentor_user_id: int, kind: str) -> tuple[User, MentorService]:
    mentor = db.get(User, mentor_user_id)
    if not mentor or mentor.role != "mentor" or not mentor.mentor:
        raise HTTPException(404, "Mentor not found")
    if not mentor.mentor.is_listed:
        raise HTTPException(400, "This mentor is not currently accepting bookings")
    svc = next((s for s in mentor.mentor.services if s.kind == kind and s.is_active), None)
    if not svc or svc.price <= 0:
        raise HTTPException(400, f"This mentor does not offer {SERVICES[kind]['label']}")
    return mentor, svc


def _ensure_thread(db: Session, student_id: int, mentor_id: int) -> Thread:
    thread = (db.query(Thread)
              .filter(Thread.student_id == student_id, Thread.mentor_id == mentor_id).first())
    if not thread:
        thread = Thread(student_id=student_id, mentor_id=mentor_id, last_message_at=now_ist())
        db.add(thread)
        db.flush()
    return thread


def _active_retainer(db: Session, student_id: int, mentor_id: int) -> Order | None:
    return (db.query(Order)
            .filter(Order.student_id == student_id, Order.mentor_id == mentor_id,
                    Order.service_kind == "retainer", Order.status == "active")
            .order_by(Order.valid_until.asc()).first())


def _new_order(db: Session, student: User, mentor: User, kind: str, **kw) -> Order:
    order = Order(
        reference=_reference(),
        student_id=student.id, mentor_id=mentor.id, service_kind=kind,
        commission_rate=COMMISSION_RATE, created_at=now_ist(), **kw,
    )
    db.add(order)
    db.flush()
    return order


# ------------------------------------------------------- 1. video session
@router.post("/video")
def book_video(payload: VideoOrderIn, user: User = Depends(student_only),
               db: Session = Depends(get_db)):
    mentor, svc = _service_or_404(db, payload.mentor_id, "video_1on1")
    profile: MentorProfile = mentor.mentor

    start = to_naive_ist(payload.start_at)
    minutes = 30 * payload.slots
    end = start + timedelta(minutes=minutes)

    if start < now_ist() + timedelta(minutes=30):
        raise HTTPException(400, "Pick a slot at least 30 minutes from now")
    if start.date().isoformat() in {b.date for b in profile.blackouts}:
        raise HTTPException(400, "The mentor has blocked that date")

    inside = False
    for w in profile.slots:
        if not w.is_active or w.day_of_week != start.weekday():
            continue
        sh, sm = parse_hhmm(w.start_time)
        eh, em = parse_hhmm(w.end_time)
        if (start.hour * 60 + start.minute) >= sh * 60 + sm and \
           (end.hour * 60 + end.minute) <= eh * 60 + em:
            inside = True
            break
    if not inside:
        raise HTTPException(400, "That time falls outside the mentor's published availability")

    clash = (db.query(Order)
             .filter(Order.mentor_id == mentor.id,
                     Order.service_kind.in_(["video_1on1", "live_eval"]),
                     Order.status.in_(["pending", "confirmed"]),
                     Order.start_at < end, Order.end_at > start).first())
    if clash:
        raise HTTPException(409, "That slot was just taken — please pick another")

    retainer = _active_retainer(db, user.id, mentor.id) if payload.use_credit else None
    if payload.use_credit:
        if not retainer:
            raise HTTPException(400, "You have no active retainer with this mentor")
        if retainer.session_credits_used >= retainer.session_credits_total:
            raise HTTPException(400, "No session credits left on that retainer")

    amount = 0 if retainer else svc.price * payload.slots
    order = _new_order(
        db, user, mentor, "video_1on1",
        title=f"{minutes}-minute mentorship call",
        subject=payload.subject, agenda=payload.agenda,
        quantity=payload.slots, unit_price=svc.price, amount=amount,
        start_at=start, end_at=end, duration_minutes=minutes,
        is_anonymous=payload.is_anonymous,
        anon_handle=_anon_handle() if payload.is_anonymous else "",
        paid_with_credit=bool(retainer),
        parent_id=retainer.id if retainer else None,
        status="pending",
    )
    if retainer:
        retainer.session_credits_used += 1
        order.escrow_state = "held"
    else:
        capture(db, order)

    _ensure_thread(db, user.id, mentor.id)
    who = f"Aspirant {order.anon_handle}" if payload.is_anonymous else user.display_name
    notify(db, mentor.id, "New session request",
           f"{who} requested {minutes} minutes on {start.strftime('%d %b, %I:%M %p')}.",
           kind="request", link="requests")
    db.commit()
    mail.session_requested(order=order, student=user, mentor=mentor)
    return order_out(order, db, user)


# -------------------------------------------- 2. offline copy evaluation
@router.post("/evaluation")
async def submit_evaluation(
    mentor_id: int = Form(...),
    answer_count: int = Form(1),
    subject: str = Form(""),
    agenda: str = Form(""),
    use_credit: bool = Form(False),
    file: UploadFile = File(...),
    user: User = Depends(student_only),
    db: Session = Depends(get_db),
):
    mentor, svc = _service_or_404(db, mentor_id, "offline_eval")
    profile: MentorProfile = mentor.mentor
    answer_count = max(1, min(answer_count, 25))

    # workload cap keeps the mentor's queue honest (Screen 6B)
    today = now_ist().date()
    todays = (db.query(Order)
              .filter(Order.mentor_id == mentor.id, Order.service_kind == "offline_eval",
                      Order.status.in_(["submitted", "evaluating"])).all())
    booked_today = sum(o.quantity for o in todays if o.created_at.date() == today)
    if profile.max_daily_copies and booked_today + answer_count > profile.max_daily_copies:
        raise HTTPException(
            409, f"{mentor.display_name} accepts {profile.max_daily_copies} answers a day and "
                 f"today's queue is full. Try tomorrow or another mentor.")

    suffix = Path(file.filename or "answer.pdf").suffix.lower()
    if suffix != ".pdf":
        raise HTTPException(400, "Answer copies must be a single PDF")
    stored = f"copy_{uuid.uuid4().hex[:10]}.pdf"
    target = COPIES_DIR / stored
    limit = MAX_PDF_MB * 1024 * 1024
    written = 0
    with target.open("wb") as fh:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > limit:
                fh.close()
                target.unlink(missing_ok=True)
                raise HTTPException(413, f"PDF exceeds the {MAX_PDF_MB} MB limit")
            fh.write(chunk)

    retainer = _active_retainer(db, user.id, mentor.id) if use_credit else None
    if use_credit:
        if not retainer:
            raise HTTPException(400, "You have no active retainer with this mentor")
        if retainer.eval_credits_used + answer_count > retainer.eval_credits_total:
            raise HTTPException(400, "Not enough evaluation credits left on that retainer")

    amount = 0 if retainer else svc.price * answer_count
    submitted = now_ist()
    order = _new_order(
        db, user, mentor, "offline_eval",
        title=f"{answer_count} answer{'s' if answer_count > 1 else ''} · copy evaluation",
        subject=subject, agenda=agenda, quantity=answer_count,
        unit_price=svc.price, amount=amount,
        upload_name=file.filename or stored, upload_stored=stored,
        sla_hours=svc.sla_hours, sla_deadline=submitted + timedelta(hours=svc.sla_hours),
        paid_with_credit=bool(retainer), parent_id=retainer.id if retainer else None,
        status="submitted",
    )
    if retainer:
        retainer.eval_credits_used += answer_count
        order.escrow_state = "held"
    else:
        capture(db, order)

    _ensure_thread(db, user.id, mentor.id)
    notify(db, mentor.id, "New copy to evaluate",
           f"{user.display_name} sent {answer_count} answer(s). "
           f"SLA: return within {svc.sla_hours}h.", kind="request", link="queue")
    notify(db, user.id, "Copy submitted",
           f"{order.reference} is with {mentor.display_name}. "
           f"Guaranteed back within {svc.sla_hours} hours.", kind="info", link="orders")
    db.commit()
    mail.copy_submitted(order=order, student=user, mentor=mentor)
    return order_out(order, db, user)


# ----------------------------------------------- 3. live copy evaluation
@router.post("/live")
async def book_live(
    mentor_id: int = Form(...),
    start_at: str = Form(...),
    subject: str = Form(""),
    agenda: str = Form(""),
    file: UploadFile = File(...),
    user: User = Depends(student_only),
    db: Session = Depends(get_db),
):
    from datetime import datetime as _dt
    mentor, svc = _service_or_404(db, mentor_id, "live_eval")
    profile: MentorProfile = mentor.mentor

    start = to_naive_ist(_dt.fromisoformat(start_at))
    end = start + timedelta(minutes=45)
    if start < now_ist() + timedelta(minutes=30):
        raise HTTPException(400, "Pick a slot at least 30 minutes from now")

    inside = False
    for w in profile.slots:
        if not w.is_active or w.day_of_week != start.weekday():
            continue
        sh, sm = parse_hhmm(w.start_time)
        eh, em = parse_hhmm(w.end_time)
        if (start.hour * 60 + start.minute) >= sh * 60 + sm and \
           (end.hour * 60 + end.minute) <= eh * 60 + em:
            inside = True
            break
    if not inside:
        raise HTTPException(400, "A live evaluation needs a free 45-minute window in the "
                                 "mentor's calendar — that time doesn't have one")
    clash = (db.query(Order)
             .filter(Order.mentor_id == mentor.id,
                     Order.service_kind.in_(["video_1on1", "live_eval"]),
                     Order.status.in_(["pending", "confirmed"]),
                     Order.start_at < end, Order.end_at > start).first())
    if clash:
        raise HTTPException(409, "That window was just taken — please pick another")

    suffix = Path(file.filename or "answer.pdf").suffix.lower()
    if suffix != ".pdf":
        raise HTTPException(400, "Upload the copy you want reviewed as a PDF")
    stored = f"live_{uuid.uuid4().hex[:10]}.pdf"
    target = COPIES_DIR / stored
    written = 0
    with target.open("wb") as fh:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > MAX_PDF_MB * 1024 * 1024:
                fh.close()
                target.unlink(missing_ok=True)
                raise HTTPException(413, f"PDF exceeds the {MAX_PDF_MB} MB limit")
            fh.write(chunk)

    order = _new_order(
        db, user, mentor, "live_eval",
        title="45-minute live copy review",
        subject=subject, agenda=agenda, quantity=1,
        unit_price=svc.price, amount=svc.price,
        start_at=start, end_at=end, duration_minutes=45,
        upload_name=file.filename or stored, upload_stored=stored,
        status="pending",
    )
    capture(db, order)
    _ensure_thread(db, user.id, mentor.id)
    notify(db, mentor.id, "Live evaluation requested",
           f"{user.display_name} booked {start.strftime('%d %b, %I:%M %p')} and attached a copy.",
           kind="request", link="requests")
    db.commit()
    mail.session_requested(order=order, student=user, mentor=mentor)
    return order_out(order, db, user)


# --------------------------------------------------- 4. retainer package
@router.post("/retainer")
def buy_retainer(payload: RetainerOrderIn, user: User = Depends(student_only),
                 db: Session = Depends(get_db)):
    mentor, svc = _service_or_404(db, payload.mentor_id, "retainer")
    if _active_retainer(db, user.id, mentor.id):
        raise HTTPException(400, "You already have an active retainer with this mentor")

    now = now_ist()
    order = _new_order(
        db, user, mentor, "retainer",
        title=svc.package_title or "Monthly retainer",
        package_title=svc.package_title or "Monthly retainer",
        deliverables=svc.deliverables,
        quantity=1, unit_price=svc.price, amount=svc.price,
        session_credits_total=svc.session_credits, eval_credits_total=svc.eval_credits,
        valid_until=now + timedelta(days=svc.validity_days or 30),
        status="active",
    )
    capture(db, order)
    _ensure_thread(db, user.id, mentor.id)
    notify(db, mentor.id, "Retainer purchased",
           f"{user.display_name} bought '{order.package_title}'. "
           f"{svc.session_credits} calls + {svc.eval_credits} evaluations.",
           kind="success", link="orders")
    notify(db, user.id, "Retainer active",
           f"{order.package_title} is live until {order.valid_until.strftime('%d %b')}. "
           "Redeem credits from your workspace.", kind="success", link="orders")
    db.commit()
    return order_out(order, db, user)


# --------------------------------------------------------------- listing
@router.get("")
def list_orders(kind: str = "", status: str = "", scope: str = "",
                user: User = Depends(current_user), db: Session = Depends(get_db)):
    q = db.query(Order)
    if user.role == "student":
        q = q.filter(Order.student_id == user.id)
    elif user.role == "mentor":
        q = q.filter(Order.mentor_id == user.id)
    if kind:
        q = q.filter(Order.service_kind.in_(kind.split(",")))
    if status:
        q = q.filter(Order.status.in_(status.split(",")))

    rows = q.order_by(Order.created_at.desc()).all()
    prime_orders(db, rows)
    now = now_ist()
    if scope == "upcoming":
        rows = [o for o in rows if o.start_at and o.start_at >= now
                and o.status in ("pending", "confirmed")]
        rows.sort(key=lambda o: o.start_at)
    elif scope == "open":
        rows = [o for o in rows if o.status in ("pending", "confirmed", "submitted",
                                                "evaluating", "ready", "active")]
    return {"count": len(rows), "results": [order_out(o, db, user) for o in rows]}


def _owned(order_id: int, user: User, db: Session) -> Order:
    order = db.get(Order, order_id)
    if not order or (user.role != "admin" and user.id not in (order.student_id, order.mentor_id)):
        raise HTTPException(404, "Order not found")
    return order


@router.get("/{order_id}")
def get_order(order_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return order_out(_owned(order_id, user, db), db, user)


# ---------------------------------------------------- mentor: scheduling
@router.post("/{order_id}/confirm")
def confirm(order_id: int, payload: DecisionIn, user: User = Depends(mentor_only),
            db: Session = Depends(get_db)):
    order = _owned(order_id, user, db)
    if order.status != "pending":
        raise HTTPException(400, f"This request is already {order.status}")
    order.status = "confirmed"
    order.decided_at = now_ist()
    order.mentor_note = payload.mentor_note
    # the mentor's own Meet/Zoom link wins; otherwise mint a usable room
    order.meeting_link = mail.meeting_url(order.reference, payload.meeting_link.strip())
    notify(db, order.student_id, "Session confirmed",
           f"{user.display_name} confirmed {order.start_at.strftime('%d %b, %I:%M %p')}.",
           kind="success", link="orders")
    db.commit()
    student = db.get(User, order.student_id)
    mail.session_confirmed(order=order, student=student, mentor=user)
    return order_out(order, db, user)


@router.post("/{order_id}/decline")
def decline(order_id: int, payload: DecisionIn, user: User = Depends(mentor_only),
            db: Session = Depends(get_db)):
    order = _owned(order_id, user, db)
    if order.status != "pending":
        raise HTTPException(400, f"This request is already {order.status}")
    order.status = "declined"
    order.decided_at = now_ist()
    order.mentor_note = payload.mentor_note
    if order.paid_with_credit and order.parent_id:
        parent = db.get(Order, order.parent_id)
        if parent and parent.session_credits_used > 0:
            parent.session_credits_used -= 1
    else:
        refund(db, order, payload.mentor_note or "Mentor declined the request")
    notify(db, order.student_id, "Request declined",
           payload.mentor_note or f"{user.display_name} could not take that slot.",
           kind="warning", link="orders")
    db.commit()
    return order_out(order, db, user)


@router.post("/{order_id}/cancel")
def cancel(order_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    order = _owned(order_id, user, db)
    if order.status not in ("pending", "confirmed"):
        raise HTTPException(400, f"A {order.status} order cannot be cancelled")
    if order.start_at and order.start_at - now_ist() < timedelta(hours=4) \
            and user.role == "student":
        raise HTTPException(400, "Sessions can only be cancelled more than 4 hours ahead. "
                                 "Message your mentor to reschedule.")
    order.status = "cancelled"
    order.cancelled_by = user.role
    if order.paid_with_credit and order.parent_id:
        parent = db.get(Order, order.parent_id)
        if parent and parent.session_credits_used > 0:
            parent.session_credits_used -= 1
    else:
        refund(db, order, f"Cancelled by the {user.role}")
    peer = order.mentor_id if user.id == order.student_id else order.student_id
    notify(db, peer, "Session cancelled",
           f"{order.reference} on {order.start_at.strftime('%d %b, %I:%M %p') if order.start_at else ''} "
           f"was cancelled by the {user.role}.", kind="warning", link="orders")
    db.commit()
    if order.start_at:
        mail.session_cancelled(order=order, student=db.get(User, order.student_id),
                               mentor=db.get(User, order.mentor_id), by_role=user.role)
    return order_out(order, db, user)


@router.post("/{order_id}/deliver")
def deliver(order_id: int, user: User = Depends(mentor_only), db: Session = Depends(get_db)):
    """Mentor marks a session done. Escrow starts its 72-hour countdown."""
    order = _owned(order_id, user, db)
    if order.status != "confirmed":
        raise HTTPException(400, "Only a confirmed session can be marked delivered")
    order.status = "delivered"
    mark_delivered(db, order)
    user.mentor.orders_completed += 1
    notify(db, order.student_id, "Session delivered",
           f"Approve {order.reference} to release payment, or raise an issue within "
           f"{ESCROW_HOLD_HOURS} hours.", kind="info", link="orders")
    db.commit()
    return order_out(order, db, user)


# -------------------------------------------- mentor: copy evaluation
@router.post("/{order_id}/start-evaluation")
def start_evaluation(order_id: int, user: User = Depends(mentor_only),
                     db: Session = Depends(get_db)):
    order = _owned(order_id, user, db)
    if order.service_kind != "offline_eval" or order.status != "submitted":
        raise HTTPException(400, "Nothing to start on this order")
    order.status = "evaluating"
    notify(db, order.student_id, "Evaluation started",
           f"{user.display_name} has opened {order.reference}.", kind="info", link="orders")
    db.commit()
    return order_out(order, db, user)


@router.post("/{order_id}/return")
async def return_evaluation(
    order_id: int,
    evaluator_feedback: str = Form(""),
    marks_awarded: str = Form(""),
    marks_total: str = Form(""),
    file: UploadFile | None = File(None),
    user: User = Depends(mentor_only),
    db: Session = Depends(get_db),
):
    order = _owned(order_id, user, db)
    if order.service_kind != "offline_eval" or order.status not in ("submitted", "evaluating"):
        raise HTTPException(400, "This order is not awaiting an evaluation")

    # Two ways to return a copy: upload a separately-marked PDF, or mark it in
    # the browser. At least one has to have happened.
    if file is not None and file.filename:
        if Path(file.filename).suffix.lower() != ".pdf":
            raise HTTPException(400, "Return the checked copy as a PDF")
        stored = f"checked_{uuid.uuid4().hex[:10]}.pdf"
        target = COPIES_DIR / stored
        written = 0
        with target.open("wb") as fh:
            while chunk := await file.read(1024 * 1024):
                written += len(chunk)
                if written > MAX_PDF_MB * 1024 * 1024:
                    fh.close()
                    target.unlink(missing_ok=True)
                    raise HTTPException(413, f"PDF exceeds the {MAX_PDF_MB} MB limit")
                fh.write(chunk)
        order.returned_name = file.filename
        order.returned_stored = stored
    elif not (order.annotations or []):
        raise HTTPException(
            400, "Mark the copy in the review room or attach a checked PDF before returning it")

    order.evaluator_feedback = evaluator_feedback
    try:
        order.marks_awarded = float(marks_awarded) if marks_awarded else None
        order.marks_total = float(marks_total) if marks_total else None
    except ValueError:
        order.marks_awarded = order.marks_total = None

    on_time = order.sla_deadline is None or now_ist() <= order.sla_deadline
    order.status = "ready"
    mark_delivered(db, order)
    user.mentor.orders_completed += 1
    notify(db, order.student_id, "Evaluation ready",
           f"{user.display_name} returned {order.reference}"
           + (" within SLA." if on_time else " (past SLA)."), kind="success", link="orders")
    db.commit()
    mail.evaluation_ready(order=order, student=db.get(User, order.student_id), mentor=user)
    return order_out(order, db, user)


# ------------------------------------------------------- student: closeout
@router.post("/{order_id}/approve")
def approve(order_id: int, user: User = Depends(student_only), db: Session = Depends(get_db)):
    """Approve & release payment — ends the transaction immediately."""
    order = _owned(order_id, user, db)
    if order.status not in ("delivered", "ready"):
        raise HTTPException(400, "This order is not awaiting your approval")
    if order.dispute and order.dispute.status == "open":
        raise HTTPException(400, "Resolve the open dispute first")
    if order.paid_with_credit:
        order.status = "approved"
        order.escrow_state = "released"
        order.released_at = now_ist()
    else:
        release(db, order, "Approved by the student")
    mentor = db.get(User, order.mentor_id)
    notify(db, order.mentor_id, "Payment released",
           f"{user.display_name} approved {order.reference}. "
           f"₹{order.mentor_payout:,} is on its way.", kind="success", link="earnings")
    db.commit()
    return order_out(order, db, user)


@router.post("/{order_id}/review")
def leave_review(order_id: int, payload: ReviewIn, user: User = Depends(student_only),
                 db: Session = Depends(get_db)):
    order = _owned(order_id, user, db)
    if order.status not in ("delivered", "ready", "approved"):
        raise HTTPException(400, "You can review once the service is delivered")
    if order.review:
        raise HTTPException(400, "You have already reviewed this order")
    db.add(Review(order_id=order.id, student_id=user.id, mentor_id=order.mentor_id,
                  rating=payload.rating, comment=payload.comment))
    mentor = db.get(User, order.mentor_id)
    if mentor and mentor.mentor:
        mentor.mentor.rating_sum += payload.rating
        mentor.mentor.rating_count += 1
    notify(db, order.mentor_id, f"New {payload.rating}★ review",
           payload.comment or f"{order.reference} was rated.", kind="success", link="dashboard")
    db.commit()
    return order_out(order, db, user)


@router.post("/{order_id}/dispute")
def raise_dispute(order_id: int, payload: DisputeIn, user: User = Depends(student_only),
                  db: Session = Depends(get_db)):
    order = _owned(order_id, user, db)
    if order.escrow_state != "held":
        raise HTTPException(400, "The dispute window for this order has closed")
    if order.dispute:
        raise HTTPException(400, "A dispute is already on record for this order")
    db.add(Dispute(order_id=order.id, raised_by=user.id, reason=payload.reason,
                   detail=payload.detail))
    order.status = "disputed"
    freeze(db, order, f"Dispute: {payload.reason}")
    notify(db, order.mentor_id, "Dispute raised",
           f"{order.reference}: {payload.reason} Funds are frozen pending admin review.",
           kind="warning", link="orders")
    notify(db, order.student_id, "Dispute submitted",
           f"{order.reference} is frozen while our team reviews the evidence.",
           kind="info", link="orders")
    db.commit()
    return order_out(order, db, user)


@router.post("/{order_id}/resolve")
def resolve_dispute(order_id: int, payload: ResolveDisputeIn,
                    user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Admin adjudication. The demo build also lets the student close their own
    dispute, so the whole loop can be walked through with one login."""
    order = _owned(order_id, user, db)
    if not order.dispute or order.dispute.status != "open":
        raise HTTPException(400, "No open dispute on this order")
    if user.role not in ("admin", "student"):
        raise HTTPException(403, "Only the platform admin can resolve a dispute")

    order.escrow_state = "held"          # unfreeze before applying the outcome
    if payload.outcome == "refund":
        order.dispute.status = "refunded"
        refund(db, order, payload.note or "Dispute upheld — refunded")
        order.status = "refunded_sla" if order.service_kind == "offline_eval" else "cancelled"
    else:
        order.dispute.status = "released"
        release(db, order, payload.note or "Dispute closed — released to mentor")
    order.dispute.resolution_note = payload.note
    order.dispute.resolved_at = now_ist()
    db.commit()
    return order_out(order, db, user)


# ------------------------------------------------- marking on the copy
ANNOTATABLE = ("offline_eval", "live_eval")


@router.get("/{order_id}/annotations")
def read_annotations(order_id: int, user: User = Depends(current_user),
                     db: Session = Depends(get_db)):
    """Polled by the aspirant during a live review so the mentor's marks appear
    as they are drawn, without needing a websocket."""
    order = _owned(order_id, user, db)
    return {
        "order_id": order.id,
        "annotations": order.annotations or [],
        "updated_at": (order.annotations_updated_at.replace(microsecond=0).isoformat()
                       if order.annotations_updated_at else None),
        "feedback": order.evaluator_feedback,
        "marks_awarded": order.marks_awarded,
        "marks_total": order.marks_total,
    }


@router.put("/{order_id}/annotations")
def save_annotations(order_id: int, payload: AnnotationsIn,
                     user: User = Depends(mentor_only), db: Session = Depends(get_db)):
    """The mentor's marks. Replaces the whole set — the client owns the state
    and sends it debounced, which keeps merge logic out of the server."""
    order = _owned(order_id, user, db)
    if order.service_kind not in ANNOTATABLE:
        raise HTTPException(400, "This order type has no copy to mark")
    if order.status in ("approved", "cancelled", "declined", "refunded_sla"):
        raise HTTPException(400, f"A {order.status} order can no longer be edited")
    if len(payload.annotations) > 5000:
        raise HTTPException(413, "Too many marks on one copy")

    order.annotations = [a.model_dump() for a in payload.annotations]
    order.annotations_updated_at = now_ist()
    if payload.evaluator_feedback is not None:
        order.evaluator_feedback = payload.evaluator_feedback
    if payload.marks_awarded is not None:
        order.marks_awarded = payload.marks_awarded
    if payload.marks_total is not None:
        order.marks_total = payload.marks_total
    db.commit()
    return {"saved": len(order.annotations),
            "updated_at": order.annotations_updated_at.replace(microsecond=0).isoformat()}


# ------------------------------------------------------------------ files
@router.get("/{order_id}/file/{which}")
def download_copy(order_id: int, which: str, user: User = Depends(current_user),
                  db: Session = Depends(get_db)):
    order = _owned(order_id, user, db)
    if which == "submitted":
        stored, name = order.upload_stored, order.upload_name
    elif which == "checked":
        stored, name = order.returned_stored, order.returned_name
    else:
        raise HTTPException(400, "Unknown file")
    if not stored:
        raise HTTPException(404, "That file has not been uploaded yet")
    path = COPIES_DIR / stored
    if not path.exists():
        raise HTTPException(404, "File missing from storage")
    return FileResponse(path, media_type="application/pdf", filename=name or stored)
