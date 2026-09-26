"""Persistent student ↔ mentor messaging. Full history is retained."""
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..config import COPIES_DIR, MAX_PDF_MB
from ..db import get_db
from ..escrow import notify
from ..models import Message, Thread, User
from ..schemas import MessageIn, ThreadIn
from ..security import current_user
from ..serializers import message_out, thread_out
from ..timeutil import now_ist

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.get("/threads")
def list_threads(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = (db.query(Thread)
            .filter(or_(Thread.student_id == user.id, Thread.mentor_id == user.id))
            .order_by(Thread.last_message_at.desc()).all())
    threads = [thread_out(t, db, user) for t in rows]
    return {"count": len(threads), "unread_total": sum(t["unread"] for t in threads),
            "results": threads}


@router.post("/threads")
def open_thread(payload: ThreadIn, user: User = Depends(current_user),
                db: Session = Depends(get_db)):
    peer = db.get(User, payload.peer_id)
    if not peer or peer.role == user.role:
        raise HTTPException(400, "You can only message the other side of a booking")
    student_id, mentor_id = ((user.id, peer.id) if user.role == "student" else (peer.id, user.id))
    thread = (db.query(Thread)
              .filter(Thread.student_id == student_id, Thread.mentor_id == mentor_id).first())
    if not thread:
        thread = Thread(student_id=student_id, mentor_id=mentor_id, last_message_at=now_ist())
        db.add(thread)
        db.commit()
    return thread_out(thread, db, user)


def _owned(thread_id: int, user: User, db: Session) -> Thread:
    thread = db.get(Thread, thread_id)
    if not thread or user.id not in (thread.student_id, thread.mentor_id):
        raise HTTPException(404, "Conversation not found")
    return thread


@router.get("/threads/{thread_id}/messages")
def read_messages(thread_id: int, user: User = Depends(current_user),
                  db: Session = Depends(get_db)):
    thread = _owned(thread_id, user, db)
    touched = False
    for m in thread.messages:
        if m.sender_id != user.id and m.read_at is None:
            m.read_at = now_ist()
            touched = True
    if touched:
        db.commit()
    peer_id = thread.mentor_id if user.id == thread.student_id else thread.student_id
    peer = db.get(User, peer_id)
    profile = peer.mentor if peer.role == "mentor" else None
    return {
        "thread_id": thread.id,
        "peer": {"id": peer.id, "name": peer.display_name, "role": peer.role,
                 "initials": peer.initials, "hue": peer.avatar_hue,
                 "response_hours": profile.response_hours if profile else None},
        "messages": [message_out(m) for m in thread.messages],
    }


@router.post("/threads/{thread_id}/messages")
def send_message(thread_id: int, payload: MessageIn, user: User = Depends(current_user),
                 db: Session = Depends(get_db)):
    thread = _owned(thread_id, user, db)
    msg = Message(thread_id=thread.id, sender_id=user.id, body=payload.body.strip(),
                  created_at=now_ist())
    db.add(msg)
    thread.last_message_at = msg.created_at
    peer_id = thread.mentor_id if user.id == thread.student_id else thread.student_id
    notify(db, peer_id, f"Message from {user.display_name}", payload.body[:120],
           kind="message", link="chat")
    db.commit()
    return message_out(msg)


@router.post("/threads/{thread_id}/attachment")
async def send_attachment(thread_id: int, file: UploadFile = File(...),
                          user: User = Depends(current_user), db: Session = Depends(get_db)):
    thread = _owned(thread_id, user, db)
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(400, "Attach an image of the doubt or a PDF")
    stored = f"chat_{uuid.uuid4().hex[:10]}{suffix}"
    target = COPIES_DIR / stored
    written = 0
    with target.open("wb") as fh:
        while chunk := await file.read(1024 * 1024):
            written += len(chunk)
            if written > MAX_PDF_MB * 1024 * 1024:
                fh.close()
                target.unlink(missing_ok=True)
                raise HTTPException(413, f"Attachment exceeds {MAX_PDF_MB} MB")
            fh.write(chunk)

    msg = Message(thread_id=thread.id, sender_id=user.id, created_at=now_ist(),
                  body=f"Shared a file: {file.filename}", attachment=stored)
    db.add(msg)
    thread.last_message_at = msg.created_at
    db.commit()
    return message_out(msg)
