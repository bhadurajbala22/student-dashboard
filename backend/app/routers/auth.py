"""OTP, registration and sign-in."""
import logging
import random

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..catalog import SERVICE_KEYS
from ..config import OTP_TTL_MINUTES
from ..db import get_db
from ..models import MentorProfile, MentorService, Notification, StudentProfile, User
from ..schemas import LoginIn, MentorRegisterIn, OtpRequestIn, StudentRegisterIn
from ..notify import send_otp
from ..notify import settings as NS
from ..notify.channels import DeliveryError
from ..security import (check_otp, create_token, hash_password, issue_otp, current_user,
                        verify_password)
from ..serializers import mentor_card, student_out, user_brief
from ..timeutil import now_ist

router = APIRouter(prefix="/api/auth", tags=["auth"])
log = logging.getLogger("nexus.auth")


def session_payload(user: User, db: Session) -> dict:
    profile = None
    if user.role == "mentor" and user.mentor:
        profile = mentor_card(user.mentor, db, owner=True)
    elif user.role == "student" and user.student:
        profile = student_out(user.student, user)
    return {"token": create_token(user), "user": user_brief(user), "profile": profile}


@router.post("/otp/request")
def request_otp(payload: OtpRequestIn, db: Session = Depends(get_db)):
    target = payload.target.strip().lower()
    if not target:
        raise HTTPException(400, "Enter an email address or mobile number first")
    if payload.channel == "email" and "@" not in target:
        raise HTTPException(400, "That doesn't look like an email address")

    otp = issue_otp(db, payload.channel, target)
    live = NS.email_configured() if payload.channel == "email" else NS.sms_configured()

    delivered, error = False, ""
    try:
        result = send_otp(channel=payload.channel, target=target,
                          code=otp.code, minutes=OTP_TTL_MINUTES)
        delivered = result.get("provider") != "console"
    except DeliveryError as e:
        error = str(e)
        log.warning("OTP delivery failed for %s: %s", target, e)

    response = {
        "sent": delivered,
        "channel": payload.channel,
        "target": target,
        "delivery": "live" if delivered else "console",
    }
    if delivered:
        response["note"] = (f"Code sent to {target}. It expires in {OTP_TTL_MINUTES} minutes.")
    elif live and error:
        # configured but the provider rejected us — surface it, do NOT leak the code
        raise HTTPException(502, f"Could not send the code: {error}")
    else:
        # No provider configured: this is a local/demo install, so the code is
        # returned here and shown in the UI. It is never exposed once a real
        # MAIL_PROVIDER / SMS_PROVIDER is set.
        response["demo_code"] = otp.code
        response["note"] = ("Demo mode — no email/SMS provider is configured, so the code "
                            "is shown here. Set MAIL_PROVIDER / SMS_PROVIDER to send for real.")
    return response


def _verify_or_400(db: Session, channel: str, target: str, code: str, label: str) -> bool:
    if not code:
        return False
    if not check_otp(db, channel, target.strip().lower(), code):
        raise HTTPException(400, f"That {label} OTP is wrong or has expired")
    return True


def _ensure_new_email(db: Session, email: str):
    if db.query(User).filter(User.email == email.lower()).first():
        raise HTTPException(400, "An account with this email already exists. Try signing in.")


@router.post("/register/mentor")
def register_mentor(payload: MentorRegisterIn, db: Session = Depends(get_db)):
    _ensure_new_email(db, payload.email)
    if not payload.accepted_terms:
        raise HTTPException(400, "You must accept the Terms of Service to continue")

    email_ok = _verify_or_400(db, "email", payload.email, payload.email_otp, "email")
    mobile_ok = _verify_or_400(db, "sms", payload.mobile, payload.mobile_otp, "mobile")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="mentor",
        legal_name=payload.legal_name.strip(),
        display_name=payload.display_name.strip(),
        mobile=payload.mobile,
        avatar_hue=random.randint(0, 359),
        email_verified=email_ok,
        mobile_verified=mobile_ok,
        accepted_terms=True,
    )
    db.add(user)
    db.flush()

    profile = MentorProfile(user_id=user.id, verification_status="draft",
                            expertise={}, languages=["English"])
    db.add(profile)
    db.flush()
    for kind in SERVICE_KEYS:                       # storefront tabs, all off to start
        db.add(MentorService(mentor_id=profile.id, kind=kind, is_active=False, price=0))

    db.add(Notification(
        user_id=user.id, kind="info", link="onboarding",
        title="Finish your storefront",
        body="Complete KYC, credentials, pricing and availability to go live.",
    ))
    db.commit()
    db.refresh(user)
    return session_payload(user, db)


@router.post("/register/student")
def register_student(payload: StudentRegisterIn, db: Session = Depends(get_db)):
    _ensure_new_email(db, payload.email)
    email_ok = _verify_or_400(db, "email", payload.email, payload.email_otp, "email")
    mobile_ok = _verify_or_400(db, "sms", payload.mobile, payload.mobile_otp, "mobile")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role="student",
        legal_name=payload.display_name.strip(),
        display_name=payload.display_name.strip(),
        mobile=payload.mobile,
        city=payload.city,
        avatar_hue=random.randint(0, 359),
        email_verified=email_ok,
        mobile_verified=mobile_ok,
        accepted_terms=True,
    )
    db.add(user)
    db.flush()

    db.add(StudentProfile(
        user_id=user.id,
        target_year=payload.target_year or now_ist().year + 1,
        previous_attempts=payload.previous_attempts,
        optional_subject=payload.optional_subject,
        preparation_stages=payload.preparation_stages,
        biggest_hurdle=payload.biggest_hurdle,
        graduation=payload.graduation,
        languages=payload.languages or ["English"],
        budget_per_session=payload.budget_per_session,
    ))
    db.add(Notification(
        user_id=user.id, kind="success", link="discover",
        title="Welcome to ToppersDeck",
        body="Your benchmarking profile is shared with every mentor you book, so the "
             "advice you get stays consistent.",
    ))
    db.commit()
    db.refresh(user)
    return session_payload(user, db)


@router.post("/login")
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Email or password is incorrect")
    if not user.is_active:
        raise HTTPException(403, "This account has been disabled")
    user.last_login_at = now_ist()
    db.commit()
    return session_payload(user, db)


@router.get("/me")
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    payload = session_payload(user, db)
    payload.pop("token", None)
    return payload
