"""The internal video vault.

Every live session is recorded to platform storage. Neither the mentor nor the
student can download the file — that protects the mentor's intellectual property
while still giving the admin team hard evidence for dispute resolution. The
student keeps a streaming window for revision, after which the file is archived
and eventually purged.
"""
import uuid
from datetime import timedelta
from pathlib import Path

import jwt
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from fastapi import UploadFile

from ..config import (JWT_ALGORITHM, JWT_SECRET, MAX_UPLOAD_MB, VAULT_DIR,
                      VAULT_PURGE_DAYS, VAULT_STREAM_DAYS)
from ..db import get_db
from ..escrow import notify
from ..models import Order, Recording, User
from ..security import current_user, mentor_only
from ..serializers import iso, recording_out
from ..timeutil import now_ist

router = APIRouter(prefix="/api/vault", tags=["vault"])

ALLOWED = {".webm", ".mp4", ".m4v", ".mov", ".mkv", ".mp3", ".m4a", ".wav", ".ogg"}


def policy() -> dict:
    return {
        "stream_days": VAULT_STREAM_DAYS,
        "purge_days": VAULT_PURGE_DAYS,
        "downloadable": False,
        "summary": (f"Sessions are recorded to the platform vault. Students may stream for "
                    f"{VAULT_STREAM_DAYS} days; the file is then archived and purged on day "
                    f"{VAULT_PURGE_DAYS}. Downloads are disabled for both parties."),
    }


@router.get("")
def list_vault(status: str = "", user: User = Depends(current_user),
               db: Session = Depends(get_db)):
    q = db.query(Order)
    if user.role == "student":
        q = q.filter(Order.student_id == user.id)
    elif user.role == "mentor":
        q = q.filter(Order.mentor_id == user.id)
    order_ids = [o.id for o in q.all()]
    if not order_ids:
        return {"count": 0, "results": [], "policy": policy()}

    rows = (db.query(Recording).filter(Recording.order_id.in_(order_ids))
            .order_by(Recording.uploaded_at.desc()).all())
    if status:
        rows = [r for r in rows if r.status in status.split(",")]

    out = []
    for rec in rows:
        order = rec.order
        viewer_is_mentor = user.id == order.mentor_id
        hide = order.is_anonymous and viewer_is_mentor
        peer = db.get(User, order.mentor_id if user.role == "student" else order.student_id)
        item = recording_out(rec)
        item["order"] = {
            "id": order.id,
            "reference": order.reference,
            "title": order.title,
            "subject": order.subject,
            "service_kind": order.service_kind,
            "start_at": iso(order.start_at),
            "duration_minutes": order.duration_minutes,
            "is_anonymous": order.is_anonymous,
            "peer_name": (f"Aspirant {order.anon_handle}" if hide
                          else (peer.display_name if peer else "")),
            "peer_initials": "A?" if hide else (peer.initials if peer else ""),
            "peer_hue": 220 if hide else (peer.avatar_hue if peer else 232),
        }
        out.append(item)
    return {"count": len(out), "results": out, "policy": policy()}


@router.post("/upload")
async def upload_recording(
    order_id: int = Form(...),
    notes: str = Form(""),
    duration_seconds: int = Form(0),
    file: UploadFile = File(...),
    user: User = Depends(mentor_only),
    db: Session = Depends(get_db),
):
    """Stands in for the platform's automatic session recorder."""
    order = db.get(Order, order_id)
    if not order or order.mentor_id != user.id:
        raise HTTPException(404, "Order not found")
    if not order.is_scheduled:
        raise HTTPException(400, "Only video sessions produce recordings")
    if order.status not in ("confirmed", "delivered", "approved", "disputed"):
        raise HTTPException(400, "Attach a recording to a confirmed or delivered session")

    suffix = Path(file.filename or "session.webm").suffix.lower()
    if suffix not in ALLOWED:
        raise HTTPException(400, f"Unsupported file type '{suffix}'")

    stored = f"vault_{order.id}_{uuid.uuid4().hex[:10]}{suffix}"
    target = VAULT_DIR / stored
    limit = MAX_UPLOAD_MB * 1024 * 1024
    written = 0
    with target.open("wb") as fh:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > limit:
                fh.close()
                target.unlink(missing_ok=True)
                raise HTTPException(413, f"Recording exceeds the {MAX_UPLOAD_MB} MB limit")
            fh.write(chunk)

    uploaded = now_ist()
    rec = Recording(
        order_id=order.id, stored_name=stored,
        label=f"{order.title} · {order.reference}",
        content_type=file.content_type or "video/webm",
        size_bytes=written,
        duration_seconds=duration_seconds or order.duration_minutes * 60,
        notes=notes, uploaded_at=uploaded,
        expires_at=uploaded + timedelta(days=VAULT_STREAM_DAYS),
        purge_at=uploaded + timedelta(days=VAULT_PURGE_DAYS),
    )
    db.add(rec)
    notify(db, order.student_id, "Recording in your vault",
           f"{order.title} is streamable for {VAULT_STREAM_DAYS} days.",
           kind="success", link="vault")
    db.commit()
    return recording_out(rec)


@router.get("/{rec_id}/stream")
def stream(rec_id: int, token: str = Query(...), db: Session = Depends(get_db)):
    """A <video> element cannot send an Authorization header, so the session
    token rides in the query string. Served inline only — never as an attachment."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid or expired link")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(401, "Invalid session")

    rec = db.get(Recording, rec_id)
    if not rec:
        raise HTTPException(404, "Recording not found")
    order = rec.order
    if user.role != "admin" and user.id not in (order.student_id, order.mentor_id):
        raise HTTPException(404, "Recording not found")
    if rec.status != "available":
        raise HTTPException(410, f"This recording is {rec.status} and no longer streamable")
    path = VAULT_DIR / rec.stored_name
    if not path.exists():
        raise HTTPException(404, "Vault file missing")

    # inline disposition + no filename: the browser plays it, it does not save it
    return FileResponse(path, media_type=rec.content_type,
                        headers={"Content-Disposition": "inline",
                                 "Cache-Control": "private, no-store",
                                 "X-Vault-Policy": "stream-only"})
