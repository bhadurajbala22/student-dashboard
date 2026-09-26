"""Password hashing, JWT issuing, OTP verification and role guards."""
import hashlib
import hmac
import os
import random
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import JWT_ALGORITHM, JWT_SECRET, OTP_TTL_MINUTES, TOKEN_TTL_HOURS
from .db import get_db
from .models import OtpCode, User
from .timeutil import now_ist

_ITERATIONS = 120_000
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _ITERATIONS)
    return f"pbkdf2_sha256${_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _algo, iterations, salt_hex, digest_hex = stored.split("$")
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(),
                                     bytes.fromhex(salt_hex), int(iterations))
        return hmac.compare_digest(digest.hex(), digest_hex)
    except (ValueError, AttributeError):
        return False


def create_token(user: User) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({
        "sub": str(user.id), "role": user.role, "email": user.email,
        "iat": now, "exp": now + timedelta(hours=TOKEN_TTL_HOURS),
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ------------------------------------------------------------------ OTP
def issue_otp(db: Session, channel: str, target: str) -> OtpCode:
    """Create a one-time code. No SMS/email provider is wired in, so the code is
    returned to the caller and shown in the UI — clearly marked as demo mode."""
    db.query(OtpCode).filter(OtpCode.target == target, OtpCode.channel == channel,
                             OtpCode.consumed == False).update({"consumed": True})  # noqa: E712
    otp = OtpCode(
        channel=channel, target=target,
        code=f"{random.randint(0, 999999):06d}",
        expires_at=now_ist() + timedelta(minutes=OTP_TTL_MINUTES),
    )
    db.add(otp)
    db.commit()
    return otp


def check_otp(db: Session, channel: str, target: str, code: str) -> bool:
    otp = (db.query(OtpCode)
           .filter(OtpCode.channel == channel, OtpCode.target == target,
                   OtpCode.consumed == False)                      # noqa: E712
           .order_by(OtpCode.created_at.desc()).first())
    if not otp or otp.expires_at < now_ist() or not hmac.compare_digest(otp.code, code.strip()):
        return False
    otp.consumed = True
    db.commit()
    return True


# ------------------------------------------------------------- auth deps
def _unauthorized(detail: str = "Not authenticated"):
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail,
                         headers={"WWW-Authenticate": "Bearer"})


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer),
                 db: Session = Depends(get_db)) -> User:
    if creds is None:
        raise _unauthorized()
    try:
        payload = decode_token(creds.credentials)
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Session expired, please sign in again")
    except jwt.PyJWTError:
        raise _unauthorized("Invalid session token")

    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise _unauthorized("Account not found or disabled")
    return user


def require_role(*roles: str):
    def _guard(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, f"This action is limited to: {', '.join(roles)}")
        return user
    return _guard


mentor_only = require_role("mentor")
student_only = require_role("student")
admin_only = require_role("admin")
