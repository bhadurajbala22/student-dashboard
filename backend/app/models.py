"""ORM models for the ToppersDeck marketplace."""
from datetime import datetime

from sqlalchemy import (Boolean, Column, DateTime, Float, ForeignKey, Integer, JSON,
                        String, Text, UniqueConstraint)
from sqlalchemy.orm import relationship

from .db import Base
from .timeutil import now_ist


def utcnow() -> datetime:
    """Default timestamp for every row.

    The whole application stores and renders naive IST wall-clock time, so the
    column defaults have to agree — using datetime.utcnow() here made every
    created_at read 5h30m in the past.
    """
    return now_ist()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)             # student | mentor | admin

    legal_name = Column(String(160), nullable=False)      # matches government ID
    display_name = Column(String(80), nullable=False)     # what students see
    mobile = Column(String(24), default="")
    city = Column(String(80), default="")
    avatar_hue = Column(Integer, default=232)
    photo = Column(String(255), default="")

    email_verified = Column(Boolean, default=False)
    mobile_verified = Column(Boolean, default=False)
    accepted_terms = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)
    last_login_at = Column(DateTime, nullable=True)

    mentor = relationship("MentorProfile", back_populates="user", uselist=False,
                          cascade="all, delete-orphan")
    student = relationship("StudentProfile", back_populates="user", uselist=False,
                           cascade="all, delete-orphan")

    @property
    def initials(self) -> str:
        parts = [p for p in self.display_name.replace('.', ' ').split() if p]
        return "".join(p[0].upper() for p in parts[:2]) or "?"


class OtpCode(Base):
    """Mock OTP store. A real deployment swaps this for an SMS/email provider."""
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True)
    channel = Column(String(10), nullable=False)          # email | sms
    target = Column(String(255), nullable=False, index=True)
    code = Column(String(6), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)


class MentorProfile(Base):
    __tablename__ = "mentor_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # --- classification & pitch -------------------------------------------
    category = Column(String(20), default="veteran")      # faculty | ranker | veteran
    headline = Column(String(200), default="")
    philosophy = Column(Text, default="")                 # About me / teaching philosophy
    employment_status = Column(String(60), default="")
    intro_video = Column(String(255), default="")
    languages = Column(JSON, default=list)

    # --- UPSC journey (Screen 3A) -----------------------------------------
    total_attempts = Column(Integer, default=0)
    prelims_cleared_years = Column(JSON, default=list)
    mains_cleared_years = Column(JSON, default=list)
    interview_years = Column(JSON, default=list)
    has_final_rank = Column(Boolean, default=False)
    final_rank = Column(Integer, nullable=True)
    service_allocated = Column(String(40), default="")
    batch_year = Column(Integer, nullable=True)
    mains_marksheet = Column(String(255), default="")     # mandatory proof if Mains cleared
    interview_admit_card = Column(String(255), default="")

    # --- academic / teaching background -----------------------------------
    highest_qualification = Column(String(60), default="")
    university = Column(String(160), default="")
    other_credentials = Column(Text, default="")
    teaching_years = Column(Float, default=0)
    online_teaching_years = Column(Float, default=0)
    students_mentored = Column(Integer, default=0)
    selections_produced = Column(Integer, default=0)

    # --- subject matter expertise (Screen 5) ------------------------------
    expertise = Column(JSON, default=dict)                # {"prelims": [...], "gs2": [...]}
    optional_subjects = Column(JSON, default=list)

    # --- KYC (Screen 2) — masked values only ------------------------------
    aadhaar_masked = Column(String(20), default="")
    pan_masked = Column(String(16), default="")
    aadhaar_front = Column(String(255), default="")
    aadhaar_back = Column(String(255), default="")
    pan_doc = Column(String(255), default="")
    bank_holder = Column(String(160), default="")
    bank_account_masked = Column(String(30), default="")
    bank_ifsc = Column(String(16), default="")
    bank_type = Column(String(12), default="Savings")
    bank_proof = Column(String(255), default="")

    # --- agreements (Screen 7) --------------------------------------------
    agreed_escrow = Column(Boolean, default=False)
    agreed_sla = Column(Boolean, default=False)
    agreed_nda = Column(Boolean, default=False)
    agreed_commission = Column(Boolean, default=False)

    # --- workload (Screen 6B) ---------------------------------------------
    max_daily_copies = Column(Integer, default=5)

    # --- status & social proof --------------------------------------------
    verification_status = Column(String(20), default="draft")
    # draft | submitted | in_review | verified | rejected
    verification_note = Column(Text, default="")
    submitted_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    is_listed = Column(Boolean, default=False)            # visible in discovery
    rating_sum = Column(Integer, default=0)
    rating_count = Column(Integer, default=0)
    orders_completed = Column(Integer, default=0)
    response_hours = Column(Integer, default=24)
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="mentor")
    services = relationship("MentorService", back_populates="mentor",
                            cascade="all, delete-orphan")
    slots = relationship("AvailabilitySlot", back_populates="mentor",
                         cascade="all, delete-orphan")
    blackouts = relationship("BlackoutDate", back_populates="mentor",
                             cascade="all, delete-orphan")

    @property
    def rating(self) -> float:
        return round(self.rating_sum / self.rating_count, 2) if self.rating_count else 0.0

    @property
    def all_subjects(self) -> list[str]:
        out: list[str] = []
        for values in (self.expertise or {}).values():
            for v in values or []:
                if v not in out:
                    out.append(v)
        return out


class MentorService(Base):
    """One storefront tab: a service the mentor has switched on, with their price."""
    __tablename__ = "mentor_services"

    id = Column(Integer, primary_key=True)
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(20), nullable=False)             # see catalog.SERVICES
    is_active = Column(Boolean, default=True)
    price = Column(Integer, default=0)                    # INR, mentor-declared

    session_tags = Column(JSON, default=list)             # video_1on1 only
    sla_hours = Column(Integer, default=48)               # offline_eval only
    package_title = Column(String(160), default="")       # retainer only
    deliverables = Column(Text, default="")
    session_credits = Column(Integer, default=0)
    eval_credits = Column(Integer, default=0)
    validity_days = Column(Integer, default=30)

    created_at = Column(DateTime, default=utcnow)
    mentor = relationship("MentorProfile", back_populates="services")

    __table_args__ = (UniqueConstraint("mentor_id", "kind", name="uq_mentor_service"),)


class AvailabilitySlot(Base):
    """A recurring weekly green block from the drag-and-drop planner."""
    __tablename__ = "availability_slots"

    id = Column(Integer, primary_key=True)
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False)
    day_of_week = Column(Integer, nullable=False)         # 0 = Monday
    day_type = Column(String(10), nullable=False)         # weekday | weekend
    start_time = Column(String(5), nullable=False)
    end_time = Column(String(5), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utcnow)

    mentor = relationship("MentorProfile", back_populates="slots")
    __table_args__ = (UniqueConstraint("mentor_id", "day_of_week", "start_time", "end_time",
                                       name="uq_slot_window"),)


class BlackoutDate(Base):
    __tablename__ = "blackout_dates"

    id = Column(Integer, primary_key=True)
    mentor_id = Column(Integer, ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False)
    date = Column(String(10), nullable=False)             # YYYY-MM-DD
    reason = Column(String(160), default="")
    mentor = relationship("MentorProfile", back_populates="blackouts")
    __table_args__ = (UniqueConstraint("mentor_id", "date", name="uq_blackout"),)


class StudentProfile(Base):
    """The Benchmarking Profile every mentor sees, so advice never conflicts."""
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    target_year = Column(Integer, default=0)
    previous_attempts = Column(Integer, default=0)
    optional_subject = Column(String(120), default="")
    preparation_stages = Column(JSON, default=list)
    biggest_hurdle = Column(Text, default="")
    graduation = Column(String(160), default="")
    languages = Column(JSON, default=list)
    budget_per_session = Column(Integer, default=0)

    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    user = relationship("User", back_populates="student")


class Order(Base):
    """One escrow-backed transaction. `service_kind` decides which fields matter."""
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    reference = Column(String(16), unique=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    service_kind = Column(String(20), nullable=False)
    parent_id = Column(Integer, ForeignKey("orders.id"), nullable=True)   # redeemed from a retainer

    title = Column(String(200), default="")
    subject = Column(String(120), default="")
    agenda = Column(Text, default="")                     # "What do you want to discuss?"
    quantity = Column(Integer, default=1)                 # answers in the PDF / sessions

    unit_price = Column(Integer, default=0)
    amount = Column(Integer, default=0)
    commission_rate = Column(Float, default=0.15)
    commission_amount = Column(Integer, default=0)
    mentor_payout = Column(Integer, default=0)
    paid_with_credit = Column(Boolean, default=False)

    is_anonymous = Column(Boolean, default=False)
    anon_handle = Column(String(24), default="")

    status = Column(String(24), default="pending")
    # video/live: pending → confirmed → delivered → approved | disputed | cancelled | declined
    # offline:    submitted → evaluating → ready → approved | refunded_sla | disputed
    # retainer:   active → expired

    # --- scheduled services -----------------------------------------------
    start_at = Column(DateTime, nullable=True)
    end_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, default=0)
    meeting_link = Column(String(255), default="")
    mentor_note = Column(Text, default="")

    # --- offline evaluation ------------------------------------------------
    upload_name = Column(String(255), default="")
    upload_stored = Column(String(255), default="")
    sla_hours = Column(Integer, default=0)
    sla_deadline = Column(DateTime, nullable=True)
    returned_name = Column(String(255), default="")
    returned_stored = Column(String(255), default="")
    evaluator_feedback = Column(Text, default="")
    # Marks drawn directly on the copy. Kept as data (not burned into a new PDF)
    # so they stay re-editable, replay live during a shared review, and render
    # crisply at any zoom. Coordinates are normalised 0..1 against the page box.
    annotations = Column(JSON, default=list)
    annotations_updated_at = Column(DateTime, nullable=True)
    marks_awarded = Column(Float, nullable=True)
    marks_total = Column(Float, nullable=True)

    # --- retainer ----------------------------------------------------------
    package_title = Column(String(160), default="")
    deliverables = Column(Text, default="")
    session_credits_total = Column(Integer, default=0)
    session_credits_used = Column(Integer, default=0)
    eval_credits_total = Column(Integer, default=0)
    eval_credits_used = Column(Integer, default=0)
    valid_until = Column(DateTime, nullable=True)

    # --- escrow ------------------------------------------------------------
    escrow_state = Column(String(16), default="held")     # held|released|refunded|frozen|liquidated
    delivered_at = Column(DateTime, nullable=True)
    auto_release_at = Column(DateTime, nullable=True)
    released_at = Column(DateTime, nullable=True)
    refunded_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=utcnow)
    decided_at = Column(DateTime, nullable=True)
    cancelled_by = Column(String(20), default="")
    reminder_sent_at = Column(DateTime, nullable=True)

    recordings = relationship("Recording", back_populates="order", cascade="all, delete-orphan")
    dispute = relationship("Dispute", back_populates="order", uselist=False,
                           cascade="all, delete-orphan")
    review = relationship("Review", back_populates="order", uselist=False,
                          cascade="all, delete-orphan")
    ledger = relationship("LedgerEntry", back_populates="order", cascade="all, delete-orphan")

    @property
    def is_scheduled(self) -> bool:
        return self.service_kind in ("video_1on1", "live_eval")


class Recording(Base):
    """Internal video vault entry. Not downloadable by either party."""
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    stored_name = Column(String(255), default="")
    label = Column(String(255), default="")
    content_type = Column(String(80), default="video/webm")
    size_bytes = Column(Integer, default=0)
    duration_seconds = Column(Integer, default=0)
    notes = Column(Text, default="")

    status = Column(String(20), default="available")      # available | archived | purged
    uploaded_at = Column(DateTime, default=utcnow)
    expires_at = Column(DateTime, nullable=False)         # end of student streaming window
    purge_at = Column(DateTime, nullable=False)
    archived_at = Column(DateTime, nullable=True)
    purged_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="recordings")


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False)
    raised_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reason = Column(String(200), nullable=False)
    detail = Column(Text, default="")
    status = Column(String(20), default="open")           # open | refunded | released
    resolution_note = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)
    resolved_at = Column(DateTime, nullable=True)

    order = relationship("Order", back_populates="dispute")


class LedgerEntry(Base):
    """Money movement trail — every escrow state change lands here."""
    __tablename__ = "ledger"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(24), nullable=False)             # captured|released|refunded|liquidated|frozen
    amount = Column(Integer, default=0)
    commission = Column(Integer, default=0)
    payout = Column(Integer, default=0)
    note = Column(String(255), default="")
    created_at = Column(DateTime, default=utcnow)

    order = relationship("Order", back_populates="ledger")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, default="")
    created_at = Column(DateTime, default=utcnow)

    order = relationship("Order", back_populates="review")


class Thread(Base):
    __tablename__ = "threads"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow)
    last_message_at = Column(DateTime, default=utcnow)

    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan",
                            order_by="Message.created_at")
    __table_args__ = (UniqueConstraint("student_id", "mentor_id", name="uq_thread_pair"),)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    thread_id = Column(Integer, ForeignKey("threads.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    body = Column(Text, nullable=False)
    attachment = Column(String(255), default="")
    created_at = Column(DateTime, default=utcnow)
    read_at = Column(DateTime, nullable=True)

    thread = relationship("Thread", back_populates="messages")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    kind = Column(String(40), default="info")
    title = Column(String(200), nullable=False)
    body = Column(Text, default="")
    link = Column(String(120), default="")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
