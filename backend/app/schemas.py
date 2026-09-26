"""Request schemas. Multipart endpoints use Form/File instead."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ------------------------------------------------------------------- auth
class OtpRequestIn(BaseModel):
    channel: str = Field(pattern="^(email|sms)$")
    target: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class MentorRegisterIn(BaseModel):
    legal_name: str = Field(min_length=2, max_length=160)
    display_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    email_otp: str = ""
    mobile: str = ""
    mobile_otp: str = ""
    password: str = Field(min_length=6, max_length=128)
    accepted_terms: bool = False


class StudentRegisterIn(BaseModel):
    display_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    email_otp: str = ""
    mobile: str = ""
    mobile_otp: str = ""
    password: str = Field(min_length=6, max_length=128)
    city: str = ""
    # benchmarking profile
    target_year: int = 0
    previous_attempts: int = 0
    optional_subject: str = ""
    preparation_stages: list[str] = []
    biggest_hurdle: str = ""
    graduation: str = ""
    languages: list[str] = []
    budget_per_session: int = 0


class StudentProfileIn(BaseModel):
    display_name: str | None = None
    mobile: str | None = None
    city: str | None = None
    target_year: int | None = None
    previous_attempts: int | None = None
    optional_subject: str | None = None
    preparation_stages: list[str] | None = None
    biggest_hurdle: str | None = None
    graduation: str | None = None
    languages: list[str] | None = None
    budget_per_session: int | None = None


# ---------------------------------------------------------------- mentor
class MentorCredentialsIn(BaseModel):
    category: str | None = None
    headline: str | None = None
    philosophy: str | None = None
    employment_status: str | None = None
    languages: list[str] | None = None
    total_attempts: int | None = None
    prelims_cleared_years: list[int] | None = None
    mains_cleared_years: list[int] | None = None
    interview_years: list[int] | None = None
    has_final_rank: bool | None = None
    final_rank: int | None = None
    service_allocated: str | None = None
    batch_year: int | None = None
    highest_qualification: str | None = None
    university: str | None = None
    other_credentials: str | None = None
    teaching_years: float | None = None
    online_teaching_years: float | None = None
    students_mentored: int | None = None
    selections_produced: int | None = None
    display_name: str | None = None
    city: str | None = None


class BankIn(BaseModel):
    aadhaar_number: str = ""
    pan_number: str = ""
    bank_holder: str = ""
    bank_account: str = ""
    bank_account_confirm: str = ""
    bank_ifsc: str = ""
    bank_type: str = "Savings"


class ServiceIn(BaseModel):
    kind: str
    is_active: bool = True
    price: int = 0
    session_tags: list[str] = []
    sla_hours: int = 48
    package_title: str = ""
    deliverables: str = ""
    session_credits: int = 0
    eval_credits: int = 0
    validity_days: int = 30


class ServicesIn(BaseModel):
    services: list[ServiceIn]


class ExpertiseIn(BaseModel):
    expertise: dict[str, list[str]] = {}
    optional_subjects: list[str] = []


class SlotIn(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: str
    end_time: str


class ScheduleIn(BaseModel):
    slots: list[SlotIn] | None = None
    max_daily_copies: int | None = None


class BlackoutIn(BaseModel):
    date: str
    reason: str = ""


class AgreementsIn(BaseModel):
    agreed_escrow: bool = False
    agreed_sla: bool = False
    agreed_nda: bool = False
    agreed_commission: bool = False


# ---------------------------------------------------------------- orders
class VideoOrderIn(BaseModel):
    mentor_id: int
    start_at: datetime
    slots: int = Field(default=1, ge=1, le=6)      # 30-minute units
    agenda: str = ""
    subject: str = ""
    is_anonymous: bool = False
    use_credit: bool = False


class RetainerOrderIn(BaseModel):
    mentor_id: int


class DecisionIn(BaseModel):
    mentor_note: str = ""
    meeting_link: str = ""


class EvaluationReturnIn(BaseModel):
    evaluator_feedback: str = ""
    marks_awarded: float | None = None
    marks_total: float | None = None


class AnnotationIn(BaseModel):
    """One mark on the copy. Coordinates are normalised 0..1 against the page,
    so a mark drawn on a phone lands in the same place on a desktop."""
    id: str = ""
    page: int = 1
    kind: str = "pen"                 # pen | highlight | strike | text
    color: str = "#dc1f26"
    size: float = 3
    points: list[list[float]] = []    # [[x, y], ...] for stroke kinds
    x: float | None = None            # anchor for text notes
    y: float | None = None
    text: str = ""
    at: str = ""


class AnnotationsIn(BaseModel):
    annotations: list[AnnotationIn] = []
    evaluator_feedback: str | None = None
    marks_awarded: float | None = None
    marks_total: float | None = None


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str = ""


class DisputeIn(BaseModel):
    reason: str
    detail: str = ""


class ResolveDisputeIn(BaseModel):
    outcome: str = Field(pattern="^(refund|release)$")
    note: str = ""


# ------------------------------------------------------------------ chat
class MessageIn(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class ThreadIn(BaseModel):
    peer_id: int
