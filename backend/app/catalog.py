"""UPSC-specific taxonomy shared with the frontend.

Subject groups follow the mentor onboarding spec (Screen 5) exactly, so a
mentor's expertise maps 1:1 onto the papers the exam actually has.
"""

# --- Subject matter expertise (Screen 5) ----------------------------------
SUBJECT_GROUPS = {
    "prelims": {
        "label": "Prelims (GS Paper I)",
        "items": ["Art & Culture", "Modern History", "Geography", "Mapping", "Polity",
                  "International Relations", "Economy", "Agriculture", "Environment",
                  "Science & Technology"],
    },
    "gs1": {
        "label": "Mains GS-1",
        "items": ["Art & Culture", "Modern History", "Post-Independence", "World History",
                  "Geography", "Society"],
    },
    "gs2": {
        "label": "Mains GS-2",
        "items": ["Polity", "Governance", "Social Justice", "International Relations"],
    },
    "gs3": {
        "label": "Mains GS-3",
        "items": ["Economy", "Agriculture", "Environment", "Science & Technology",
                  "Disaster Management", "Internal Security"],
    },
    "gs4": {
        "label": "Mains GS-4 (Ethics)",
        "items": ["Ethics Theory", "Case Studies"],
    },
    "essay": {
        "label": "Essay",
        "items": ["Philosophical", "Thematic"],
    },
}

OPTIONAL_SUBJECTS = [
    "Agriculture", "Animal Husbandry & Veterinary Science", "Anthropology", "Botany",
    "Chemistry", "Civil Engineering", "Commerce & Accountancy", "Economics",
    "Electrical Engineering", "Geography", "Geology", "History", "Law", "Management",
    "Mathematics", "Mechanical Engineering", "Medical Science", "Philosophy", "Physics",
    "Political Science & International Relations", "Psychology", "Public Administration",
    "Sociology", "Statistics", "Zoology",
    "Hindi Literature", "English Literature", "Urdu Literature", "Tamil Literature",
    "Bengali Literature", "Marathi Literature", "Kannada Literature", "Telugu Literature",
]

# --- Services (Screen 4) --------------------------------------------------
SERVICES = {
    "video_1on1": {
        "key": "video_1on1",
        "label": "1-on-1 Video Session",
        "short": "Video call",
        "unit": "per 30 min",
        "unit_minutes": 30,
        "blurb": "Strategy building, mental health support, timetable planning and concept doubts.",
        "delivery": "Time-based micro-transactions booked against the mentor's calendar.",
    },
    "offline_eval": {
        "key": "offline_eval",
        "label": "Offline Answer Evaluation",
        "short": "Copy checking",
        "unit": "per answer",
        "unit_minutes": 0,
        "blurb": "High-volume, detailed checking of Mains answers and Essays.",
        "delivery": "Asynchronous PDF upload bound by a guaranteed turnaround SLA.",
    },
    "live_eval": {
        "key": "live_eval",
        "label": "Live Answer Evaluation",
        "short": "Live copy review",
        "unit": "per 45 min",
        "unit_minutes": 45,
        "blurb": "Premium masterclass on answer structuring with real-time feedback.",
        "delivery": "Video call with an integrated digital whiteboard over your uploaded copy.",
    },
    "retainer": {
        "key": "retainer",
        "label": "Monthly Retainer",
        "short": "Retainer",
        "unit": "per month",
        "unit_minutes": 0,
        "blurb": "Long-term handholding with daily targets and ongoing chat access.",
        "delivery": "Bundled session credits + evaluation credits valid for 30 days.",
    },
}
SERVICE_KEYS = list(SERVICES.keys())

SESSION_TAGS = [
    "Prelims Strategy",
    "Mains Strategy & Answer Writing Approach",
    "Subject-Specific Doubts",
    "Timetable & Routine Planning",
    "Mental Health, Stress & Motivation",
]

# --- Mentor classification (Idea deck §2) ---------------------------------
MENTOR_CATEGORIES = {
    "faculty": {
        "key": "faculty", "label": "Premium Faculty",
        "blurb": "Subject-matter expertise and high-level conceptual clarity.",
    },
    "ranker": {
        "key": "ranker", "label": "Recent Ranker",
        "blurb": "Selected candidates in their pre-LBSNAA window — the most contemporary strategy available.",
    },
    "veteran": {
        "key": "veteran", "label": "Veteran Aspirant",
        "blurb": "Interview or Mains cleared. The operational backbone for handholding and copy evaluation.",
    },
}

EMPLOYMENT_STATUSES = ["Full-time Faculty", "Independent Mentor", "Serving Officer",
                       "Private Sector", "Full-time Aspirant"]

SERVICES_ALLOCATED = ["IAS", "IPS", "IFS (Foreign)", "IFoS (Forest)", "IRS (IT)",
                      "IRS (C&IT)", "IAAS", "IRTS", "IDAS", "IPoS", "IRPS", "ITS", "Other"]

# --- Student benchmarking profile (Student Screen 1B) ---------------------
PREPARATION_STAGES = [
    "Just starting / NCERT reading",
    "Standard books completed",
    "Prelims focused revision",
    "Answer writing phase",
    "Interview preparation",
]

LANGUAGES = ["English", "Hindi", "Hinglish", "Bengali", "Tamil", "Telugu", "Marathi",
             "Kannada", "Malayalam", "Gujarati", "Odia", "Punjabi", "Assamese"]

QUALIFICATIONS = ["PhD", "M.Phil", "Post Graduate (Masters)", "Graduate (Bachelors)",
                  "Professional (CA/CS/MBBS/LLB)"]

DISPUTE_REASONS = [
    "Mentor did not show up.",
    "Mentor was highly unprofessional.",
    "Evaluation quality was unacceptably poor.",
    "Evaluation was returned after the promised SLA.",
]

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
EXAM_YEARS = list(range(2026, 2005, -1))


def all_subjects() -> list[str]:
    seen, out = set(), []
    for group in SUBJECT_GROUPS.values():
        for item in group["items"]:
            if item not in seen:
                seen.add(item)
                out.append(item)
    return out


def catalog_payload() -> dict:
    from .config import COMMISSION_RATE, ESCROW_HOLD_HOURS, SLA_CHOICES, VAULT_STREAM_DAYS
    return {
        "subject_groups": SUBJECT_GROUPS,
        "all_subjects": all_subjects(),
        "optional_subjects": OPTIONAL_SUBJECTS,
        "services": SERVICES,
        "service_keys": SERVICE_KEYS,
        "session_tags": SESSION_TAGS,
        "mentor_categories": MENTOR_CATEGORIES,
        "employment_statuses": EMPLOYMENT_STATUSES,
        "services_allocated": SERVICES_ALLOCATED,
        "preparation_stages": PREPARATION_STAGES,
        "languages": LANGUAGES,
        "qualifications": QUALIFICATIONS,
        "dispute_reasons": DISPUTE_REASONS,
        "day_names": DAY_NAMES,
        "exam_years": EXAM_YEARS,
        "sla_choices": SLA_CHOICES,
        "commission_rate": COMMISSION_RATE,
        "escrow_hours": ESCROW_HOLD_HOURS,
        "vault_stream_days": VAULT_STREAM_DAYS,
    }
