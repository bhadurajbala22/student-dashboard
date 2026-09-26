"""Rate-guidance engine.

Mentors are independent providers and set their own free-market prices. The
platform only shows a transparent reference band derived from what they
declared, so the number is anchored to verifiable credentials rather than
guesswork. Every line of the arithmetic is returned so nothing is a black box.
"""
from .config import COMMISSION_RATE

CATEGORY_BASE = {
    "faculty": 420,      # subject-matter specialists
    "ranker": 520,       # selected candidates, scarce pre-LBSNAA window
    "veteran": 260,      # interview/mains cleared aspirants
}

QUALIFICATION_WEIGHT = {
    "PhD": 180,
    "M.Phil": 120,
    "Post Graduate (Masters)": 80,
    "Graduate (Bachelors)": 30,
    "Professional (CA/CS/MBBS/LLB)": 100,
}


def _round50(v: float) -> int:
    return max(50, int(round(v / 50.0) * 50))


def _round10(v: float) -> int:
    return max(10, int(round(v / 5.0) * 5))


def suggest_rates(data: dict) -> dict:
    """Return a suggested price for every service plus the reasoning behind it."""
    lines: list[dict] = []

    def add(label: str, value: float) -> float:
        if value:
            lines.append({"label": label, "value": int(round(value))})
        return value

    category = data.get("category") or "veteran"
    base = CATEGORY_BASE.get(category, CATEGORY_BASE["veteran"])
    total = float(base)
    lines.append({"label": f"Base rate — {category.title()} mentor, 30 min", "value": base})

    rank = data.get("final_rank")
    if data.get("has_final_rank") and rank:
        rank = int(rank)
        bonus = 900 if rank <= 50 else 650 if rank <= 200 else 420 if rank <= 500 else 260
        total += add(f"Final rank AIR {rank}", bonus)

    interviews = len(data.get("interview_years") or [])
    total += add(f"Interview calls — {interviews}", min(interviews, 4) * 150)

    mains = len(data.get("mains_cleared_years") or [])
    total += add(f"Mains qualified — {mains}x", min(mains, 4) * 95)

    prelims = len(data.get("prelims_cleared_years") or [])
    total += add(f"Prelims cleared — {prelims}x", min(prelims, 5) * 45)

    qual = data.get("highest_qualification") or ""
    total += add(f"Qualification — {qual}", QUALIFICATION_WEIGHT.get(qual, 0))

    teaching = float(data.get("teaching_years") or 0)
    total += add(f"Teaching experience — {teaching:g} yr", min(teaching, 20) * 55)

    online = float(data.get("online_teaching_years") or 0)
    total += add(f"Online delivery experience — {online:g} yr", min(online, 15) * 22)

    selections = int(data.get("selections_produced") or 0)
    total += add(f"Students in the final list — {selections}", min(selections, 60) * 9)

    mentored = int(data.get("students_mentored") or 0)
    total += add(f"Students mentored — {mentored}", min(mentored / 100, 5) * 30)

    optionals = data.get("optional_subjects") or []
    if optionals:
        total += add(f"Optional-subject specialist — {len(optionals)}", min(len(optionals), 2) * 110)

    breadth = sum(len(v or []) for v in (data.get("expertise") or {}).values())
    if breadth >= 8:
        total += add(f"Broad syllabus coverage — {breadth} topics", 90)

    video30 = _round50(total)
    per_hour_equiv = video30 * 2

    rates = {
        # a 45-minute live evaluation is 1.5x the 30-minute unit, plus a premium
        # for the whiteboard format and pre-reading the copy
        "video_1on1": video30,
        "live_eval": _round50(video30 * 1.9),
        # per-answer checking scales off the hourly equivalent: roughly 12 answers
        # an hour for a careful evaluator
        "offline_eval": _round10(per_hour_equiv / 12),
        # a month of 4 calls + 20 evaluations, bundled at ~20% off
        "retainer": _round50((video30 * 2 * 4 + _round10(per_hour_equiv / 12) * 20) * 0.8),
    }

    take = {k: {
        "price": v,
        "commission": int(round(v * COMMISSION_RATE)),
        "payout": v - int(round(v * COMMISSION_RATE)),
    } for k, v in rates.items()}

    return {
        "rates": rates,
        "band": {k: {"min": _round50(v * 0.75), "max": _round50(v * 1.35)} for k, v in rates.items()},
        "earnings": take,
        "breakdown": lines,
        "anchor": video30,
        "commission_rate": COMMISSION_RATE,
        "note": ("You set the final prices. This band is only a reference derived from the "
                 "credentials you entered and verified."),
    }


def split_amount(amount: int, rate: float = COMMISSION_RATE) -> tuple[int, int]:
    """Return (commission, mentor_payout) for a gross amount."""
    commission = int(round(amount * rate))
    return commission, amount - commission
