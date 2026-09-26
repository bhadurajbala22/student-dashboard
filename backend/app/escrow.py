"""Escrow engine — capture, hold, release, refund, liquidate.

Money is captured up front and held by the platform. It reaches the mentor only
after the service is delivered and the student's dispute window closes, so the
platform runs on negative working capital and neither side has to trust the other.
"""
import logging
import shutil
from datetime import timedelta

from sqlalchemy.orm import Session

from .config import (COMMISSION_RATE, ESCROW_HOLD_HOURS, VAULT_ARCHIVE_DIR, VAULT_DIR)
from .models import LedgerEntry, Notification, Order, Recording, User
from .pricing import split_amount
from .timeutil import now_ist

log = logging.getLogger("nexus.escrow")


def _entry(db: Session, order: Order, kind: str, note: str = "",
           amount: int | None = None, commission: int | None = None,
           payout: int | None = None):
    db.add(LedgerEntry(
        order_id=order.id, kind=kind, note=note,
        amount=order.amount if amount is None else amount,
        commission=order.commission_amount if commission is None else commission,
        payout=order.mentor_payout if payout is None else payout,
    ))


def notify(db: Session, user_id: int, title: str, body: str = "",
           kind: str = "info", link: str = ""):
    db.add(Notification(user_id=user_id, title=title, body=body, kind=kind, link=link))


# --------------------------------------------------------------- capture
def capture(db: Session, order: Order, note: str = "Funds held in platform escrow"):
    commission, payout = split_amount(order.amount, order.commission_rate or COMMISSION_RATE)
    order.commission_amount = commission
    order.mentor_payout = payout
    order.escrow_state = "held"
    _entry(db, order, "captured", note)


# ------------------------------------------------------------- delivery
def mark_delivered(db: Session, order: Order):
    """Start the dispute clock. Nothing moves to the mentor until it expires."""
    order.delivered_at = now_ist()
    order.auto_release_at = order.delivered_at + timedelta(hours=ESCROW_HOLD_HOURS)
    _entry(db, order, "delivered", f"Auto-release in {ESCROW_HOLD_HOURS}h unless disputed",
           amount=0, commission=0, payout=0)


def release(db: Session, order: Order, note: str = "Released to mentor"):
    if order.escrow_state in ("released", "refunded", "liquidated"):
        return False
    order.escrow_state = "released"
    order.released_at = now_ist()
    if order.status not in ("approved", "expired"):
        order.status = "approved"
    _entry(db, order, "released", note)
    notify(db, order.mentor_id, f"₹{order.mentor_payout:,} released",
           f"{order.reference} cleared escrow. {note}", kind="success", link="earnings")
    return True


def refund(db: Session, order: Order, note: str = "Refunded to student"):
    if order.escrow_state in ("released", "refunded", "liquidated"):
        return False
    order.escrow_state = "refunded"
    order.refunded_at = now_ist()
    _entry(db, order, "refunded", note, commission=0, payout=0)
    notify(db, order.student_id, f"₹{order.amount:,} refunded",
           f"{order.reference} — {note}", kind="success", link="orders")
    notify(db, order.mentor_id, "Order refunded",
           f"{order.reference} was refunded to the student. {note}", kind="warning", link="orders")
    return True


def freeze(db: Session, order: Order, note: str = "Frozen pending dispute review"):
    order.escrow_state = "frozen"
    _entry(db, order, "frozen", note, commission=0, payout=0)


def liquidate(db: Session, order: Order, note: str):
    """Expired retainer credits: the platform keeps its commission on the unused
    portion and the remainder clears to the mentor, leaving no dead liability."""
    used = order.session_credits_used + order.eval_credits_used
    total = max(1, order.session_credits_total + order.eval_credits_total)
    unused_ratio = max(0.0, 1 - used / total)
    unused_amount = int(round(order.amount * unused_ratio))
    commission, payout = split_amount(unused_amount, order.commission_rate)
    order.escrow_state = "liquidated"
    order.released_at = now_ist()
    order.status = "expired"
    _entry(db, order, "liquidated", note, amount=unused_amount,
           commission=commission, payout=payout)
    notify(db, order.mentor_id, "Retainer expired",
           f"{order.reference}: ₹{payout:,} from unused credits cleared to you.",
           kind="info", link="earnings")
    notify(db, order.student_id, "Retainer expired",
           f"{order.reference} reached its validity date with {total - used} credits unused.",
           kind="warning", link="orders")


def mentor_balances(db: Session, mentor_user_id: int) -> dict:
    orders = db.query(Order).filter(Order.mentor_id == mentor_user_id).all()
    in_escrow = sum(o.mentor_payout for o in orders
                    if o.escrow_state == "held" and o.status not in ("cancelled", "declined"))
    frozen = sum(o.mentor_payout for o in orders if o.escrow_state == "frozen")
    released = sum(e.payout for o in orders for e in o.ledger
                   if e.kind in ("released", "liquidated"))
    commission_paid = sum(e.commission for o in orders for e in o.ledger
                          if e.kind in ("released", "liquidated"))
    clearing_soon = [o for o in orders
                     if o.escrow_state == "held" and o.auto_release_at
                     and o.auto_release_at <= now_ist() + timedelta(hours=24)]
    return {
        "in_escrow": in_escrow,
        "frozen": frozen,
        "released": released,
        "commission_paid": commission_paid,
        "lifetime_gross": released + commission_paid,
        "clearing_24h": sum(o.mentor_payout for o in clearing_soon),
        "clearing_count": len(clearing_soon),
    }


# ------------------------------------------------------------------ sweep
def sweep_once() -> dict:
    """Run every automated money/retention rule. Idempotent and safe to repeat."""
    from .db import SessionLocal
    db = SessionLocal()
    stats = {"released": 0, "sla_refunded": 0, "expired": 0, "archived": 0,
             "purged": 0, "reminded": 0}
    try:
        now = now_ist()

        # 1. auto-release delivered orders whose dispute window has closed
        for order in (db.query(Order)
                      .filter(Order.escrow_state == "held",
                              Order.auto_release_at.isnot(None))
                      .all()):
            if order.auto_release_at <= now and order.status in ("delivered", "ready"):
                release(db, order, f"No dispute raised within {ESCROW_HOLD_HOURS}h")
                stats["released"] += 1

        # 2. offline evaluations that blew their SLA are refunded automatically
        for order in (db.query(Order)
                      .filter(Order.service_kind == "offline_eval",
                              Order.status.in_(["submitted", "evaluating"]),
                              Order.sla_deadline.isnot(None))
                      .all()):
            if order.sla_deadline <= now:
                order.status = "refunded_sla"
                if order.paid_with_credit:
                    parent = db.get(Order, order.parent_id) if order.parent_id else None
                    if parent and parent.eval_credits_used > 0:
                        parent.eval_credits_used -= 1     # hand the credit back
                    notify(db, order.student_id, "Evaluation credit returned",
                           f"{order.reference} missed its {order.sla_hours}h SLA — "
                           "the credit is back in your retainer.", kind="warning", link="orders")
                else:
                    refund(db, order, f"Missed the {order.sla_hours}h turnaround SLA")
                notify(db, order.mentor_id, "SLA missed",
                       f"{order.reference} passed its {order.sla_hours}h deadline and was "
                       "automatically refunded.", kind="warning", link="queue")
                stats["sla_refunded"] += 1

        # 3. retainers past their validity date
        for order in (db.query(Order)
                      .filter(Order.service_kind == "retainer", Order.status == "active",
                              Order.valid_until.isnot(None))
                      .all()):
            if order.valid_until <= now:
                liquidate(db, order, "Validity period ended")
                stats["expired"] += 1

        # 3b. remind both sides shortly before a confirmed session starts
        from .notify import settings as NS
        from . import notify as mail
        window = now + timedelta(minutes=NS.REMINDER_MINUTES)
        for order in (db.query(Order)
                      .filter(Order.status == "confirmed",
                              Order.reminder_sent_at.is_(None),
                              Order.start_at.isnot(None))
                      .all()):
            if now < order.start_at <= window:
                student = db.get(User, order.student_id)
                mentor = db.get(User, order.mentor_id)
                minutes_away = max(1, int((order.start_at - now).total_seconds() // 60))
                mail.session_reminder(order=order, student=student, mentor=mentor,
                                      minutes_away=minutes_away)
                order.reminder_sent_at = now
                notify(db, order.student_id, "Session starting soon",
                       f"{order.title} with {mentor.display_name} starts in "
                       f"{minutes_away} minutes.", kind="info", link="orders")
                stats["reminded"] += 1

        # 4. video vault retention
        for rec in db.query(Recording).filter(Recording.status == "available").all():
            if rec.expires_at <= now:
                src = VAULT_DIR / rec.stored_name
                if src.exists():
                    shutil.move(str(src), str(VAULT_ARCHIVE_DIR / rec.stored_name))
                rec.status = "archived"
                rec.archived_at = now
                stats["archived"] += 1
                if rec.order:
                    notify(db, rec.order.student_id, "Recording archived",
                           f"The recording for {rec.order.title} passed its streaming window.",
                           kind="warning", link="vault")

        for rec in db.query(Recording).filter(Recording.status == "archived").all():
            if rec.purge_at <= now:
                for folder in (VAULT_DIR, VAULT_ARCHIVE_DIR):
                    (folder / rec.stored_name).unlink(missing_ok=True)
                rec.status = "purged"
                rec.purged_at = now
                stats["purged"] += 1

        if any(stats.values()):
            db.commit()
            log.info("sweep: %s", stats)
        else:
            db.rollback()
    except Exception:
        db.rollback()
        log.exception("escrow sweep failed")
    finally:
        db.close()
    stats["swept_at"] = now_ist().isoformat()
    return stats


async def sweep_loop():
    import asyncio
    from .config import SWEEP_SECONDS
    while True:
        try:
            await asyncio.to_thread(sweep_once)
        except Exception:
            log.exception("sweep loop error")
        await asyncio.sleep(SWEEP_SECONDS)
