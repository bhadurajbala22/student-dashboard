"""Pre-registered mentors, demo aspirants and a full spread of marketplace activity."""
import random
from datetime import timedelta

from .config import COPIES_DIR, VAULT_ARCHIVE_DIR, VAULT_DIR, VAULT_PURGE_DAYS, VAULT_STREAM_DAYS
from .db import SessionLocal
from .escrow import capture, mark_delivered, release
from .models import (AvailabilitySlot, BlackoutDate, Dispute, MentorProfile, MentorService,
                     Message, Notification, Order, Recording, Review, StudentProfile,
                     Thread, User)
from .sample_files import make_audio, make_pdf
from .security import hash_password
from .timeutil import now_ist

DEMO_PASSWORD = "demo1234"

# -- service shorthand: (kind, price, extra) ---------------------------------
def V(price, tags): return ("video_1on1", price, {"session_tags": tags})
def O(price, sla): return ("offline_eval", price, {"sla_hours": sla})
def L(price): return ("live_eval", price, {})
def R(price, title, deliverables, calls, evals): return ("retainer", price, {
    "package_title": title, "deliverables": deliverables,
    "session_credits": calls, "eval_credits": evals, "validity_days": 30})


TAG_PRELIMS = "Prelims Strategy"
TAG_MAINS = "Mains Strategy & Answer Writing Approach"
TAG_DOUBTS = "Subject-Specific Doubts"
TAG_PLAN = "Timetable & Routine Planning"
TAG_MIND = "Mental Health, Stress & Motivation"

MENTORS = [
    dict(
        legal_name="Dr. Ananya Raghunathan", display_name="Dr. Ananya R.",
        email="ananya@nexus.in", city="New Delhi", category="faculty",
        headline="Polity & Governance · 12 years of Prelims-to-Interview mentorship",
        philosophy="I teach the Constitution the way the examiner reads it — provision, "
                   "intent, and the current-affairs hook. Every session ends with three "
                   "PYQ-style MCQs and one 150-word answer you write in front of me, which "
                   "we then dismantle together. I do not hand out notes; you leave with your "
                   "own, which is what survives exam pressure.",
        employment_status="Full-time Faculty", qualification="PhD",
        university="Jawaharlal Nehru University",
        credentials="UGC-NET & JRF · 14 peer-reviewed papers on Indian federalism · "
                    "Authored 'Polity Decoded' (3rd edition) · 9 years at a national institute",
        attempts=3, prelims=[2011, 2012, 2013], mains=[2012, 2013], interviews=[2013],
        teaching=12, online=7, mentored=1900, selections=41, response=6,
        expertise={"prelims": ["Polity", "International Relations", "Economy"],
                   "gs2": ["Polity", "Governance", "Social Justice", "International Relations"],
                   "essay": ["Thematic"]},
        optionals=["Political Science & International Relations"],
        services=[V(900, [TAG_MAINS, TAG_DOUBTS, TAG_PRELIMS]), O(120, 48), L(1600),
                  R(14500, "30-Day Polity & GS-2 Rigor",
                    "4 video calls + 20 answer evaluations returned inside 48h + daily "
                    "question prompt on chat + one full GS-2 mock discussion.", 4, 20)],
        slots=[(0, "18:00", "21:00"), (2, "18:00", "21:00"), (4, "19:00", "21:00"),
               (5, "09:00", "13:00"), (6, "10:00", "13:00")],
        max_copies=8, rating=(4.8, 61),
    ),
    dict(
        legal_name="Vikram Sethi", display_name="Vikram Sethi, IAS (Retd.)",
        email="vikram@nexus.in", city="Lucknow", category="faculty",
        headline="Retired IAS · Ethics (GS-IV), Essay and the Personality Test",
        philosophy="Thirty-one years in the service, two districts, and a stint in the "
                   "Department of Personnel. I have sat on selection boards, so I coach the "
                   "interview the way the board actually scores it: clarity, balance, and no "
                   "rehearsed lines. For GS-IV we work only on case studies — definitions "
                   "will not get you past 95.",
        employment_status="Serving Officer", qualification="Post Graduate (Masters)",
        university="St. Stephen's College, Delhi",
        credentials="AIR 34, CSE 1989 · IAS, UP cadre · Board member for 4 state PSC panels · "
                    "Secretary-rank at retirement",
        attempts=1, prelims=[1989], mains=[1989], interviews=[1989],
        rank=34, service="IAS", batch=1990,
        teaching=9, online=4, mentored=740, selections=63, response=12,
        expertise={"gs4": ["Ethics Theory", "Case Studies"],
                   "gs2": ["Governance", "Social Justice"],
                   "essay": ["Philosophical", "Thematic"]},
        optionals=["Public Administration"],
        services=[V(1600, [TAG_MAINS, TAG_MIND, TAG_PLAN]), L(2800),
                  R(26000, "Interview & Ethics Intensive",
                    "3 full mock interviews with written feedback + 2 essay reviews + "
                    "DAF deep-dive session.", 5, 4)],
        slots=[(1, "17:00", "20:00"), (3, "17:00", "20:00"), (5, "10:00", "14:00")],
        max_copies=0, rating=(4.9, 38),
    ),
    dict(
        legal_name="Aarav Menon", display_name="Aarav Menon (AIR 42)",
        email="aarav@nexus.in", city="Bengaluru", category="ranker",
        headline="AIR 42, CSE 2025 · IAS probationer · strategy that worked this cycle",
        philosophy="I wrote this exam eleven months ago, so I can tell you exactly what the "
                   "2025 papers rewarded and what they punished. I keep my own booklists, "
                   "revision tables and answer copies open during sessions — you see the real "
                   "artefacts, not a sanitised version. Available only until my LBSNAA "
                   "foundation course begins.",
        employment_status="Serving Officer", qualification="Graduate (Bachelors)",
        university="IIT Madras",
        credentials="AIR 42, CSE 2025 · Prelims cleared 2023, 2024, 2025 · "
                    "Mains 2024 & 2025 · B.Tech Civil Engineering",
        attempts=3, prelims=[2023, 2024, 2025], mains=[2024, 2025], interviews=[2024, 2025],
        rank=42, service="IAS", batch=2026,
        teaching=1, online=1, mentored=180, selections=4, response=8,
        expertise={"prelims": ["Polity", "Economy", "Environment", "Science & Technology",
                               "Modern History"],
                   "gs2": ["Polity", "Governance"], "gs3": ["Economy", "Internal Security"],
                   "essay": ["Thematic"]},
        optionals=["Political Science & International Relations"],
        services=[V(1100, [TAG_PRELIMS, TAG_MAINS, TAG_PLAN, TAG_DOUBTS]), O(150, 24),
                  R(17000, "Prelims 2027 Sprint",
                    "4 strategy calls + 16 answer evaluations in 24h + my personal revision "
                    "tables and booklist + weekly accountability check on chat.", 4, 16)],
        slots=[(0, "20:00", "22:30"), (2, "20:00", "22:30"), (4, "20:00", "22:30"),
               (6, "09:00", "12:00")],
        max_copies=6, rating=(4.9, 27),
    ),
    dict(
        legal_name="Sneha Deshpande", display_name="Sneha Deshpande",
        email="sneha@nexus.in", city="Pune", category="veteran",
        headline="Answer-writing specialist · 300+ copies evaluated a month",
        philosophy="I do one thing well: turn a 6-mark answer into an 11-mark answer. Send "
                   "the copy before we talk, and the hour goes entirely on structure, "
                   "diagrams, and the intro-conclusion pair that actually earns marks. I "
                   "return offline copies inside 24 hours with margin annotations, not a "
                   "generic rubric.",
        employment_status="Independent Mentor", qualification="Post Graduate (Masters)",
        university="TISS Mumbai",
        credentials="Mains qualified 2022 & 2024 · Interview call 2024 · Evaluator for two "
                    "national test series · 11,000+ copies checked",
        attempts=4, prelims=[2021, 2022, 2023, 2024], mains=[2022, 2024], interviews=[2024],
        teaching=6, online=6, mentored=890, selections=17, response=4,
        expertise={"gs1": ["Society", "Modern History"],
                   "gs2": ["Polity", "Governance", "Social Justice"],
                   "gs3": ["Economy", "Environment"], "gs4": ["Case Studies", "Ethics Theory"],
                   "essay": ["Philosophical", "Thematic"]},
        optionals=["Public Administration"],
        services=[V(450, [TAG_MAINS, TAG_DOUBTS, TAG_PLAN]), O(45, 24), L(800),
                  R(7800, "Daily Mains Rigor",
                    "One question every day evaluated within 24 hours + 4 weekend calls to "
                    "review the week's copies. Built for the answer-writing phase.", 4, 26)],
        slots=[(1, "18:30", "21:30"), (3, "18:30", "21:30"), (5, "08:00", "12:00"),
               (6, "08:00", "12:00")],
        max_copies=12, rating=(4.7, 94),
    ),
    dict(
        legal_name="Nandini Iyer", display_name="Nandini Iyer (AIR 118)",
        email="nandini@nexus.in", city="Chennai", category="ranker",
        headline="AIR 118, IPS 2024 · burnout, plateaus and getting back on the table",
        philosophy="I failed twice before this rank and spent most of 2022 unable to open a "
                   "book. I mentor the part nobody sells: what to do when the timetable has "
                   "collapsed and the attempt is still six months away. Sessions are "
                   "judgement-free and you are welcome to book anonymously — plenty of people do.",
        employment_status="Serving Officer", qualification="Post Graduate (Masters)",
        university="Delhi University",
        credentials="AIR 118, CSE 2024 · IPS, TN cadre · Prelims 2021-2024 · "
                    "Trained in peer mental-health first aid",
        attempts=4, prelims=[2021, 2022, 2023, 2024], mains=[2023, 2024], interviews=[2024],
        rank=118, service="IPS", batch=2025,
        teaching=2, online=2, mentored=310, selections=6, response=6,
        expertise={"prelims": ["Polity", "Modern History", "Geography"],
                   "gs1": ["Society"], "gs4": ["Case Studies"], "essay": ["Philosophical"]},
        optionals=["Sociology"],
        services=[V(750, [TAG_MIND, TAG_PLAN, TAG_PRELIMS]),
                  R(9800, "Back on Track — 30 days",
                    "4 calls (one every week) + unlimited chat check-ins + a written weekly "
                    "plan you actually have capacity for.", 4, 6)],
        slots=[(1, "19:00", "21:30"), (3, "19:00", "21:30"), (5, "15:00", "19:00"),
               (6, "15:00", "19:00")],
        max_copies=0, rating=(5.0, 44),
    ),
    dict(
        legal_name="Prof. Meera Krishnan", display_name="Prof. Meera Krishnan",
        email="meera@nexus.in", city="Chennai", category="faculty",
        headline="Geography & Environment · map-first teaching, 15 years",
        philosophy="Physical geography becomes easy the moment you can draw it. We build "
                   "every topic on a blank outline map, then layer the environment and "
                   "disaster-management angles that GS-I and GS-III keep asking about. "
                   "Bring a pencil, not a highlighter.",
        employment_status="Full-time Faculty", qualification="PhD",
        university="University of Madras",
        credentials="UGC-NET · ISRO remote-sensing certification · Co-author of a state "
                    "board geography textbook · 15 years in classrooms",
        attempts=2, prelims=[2009, 2010], mains=[2010], interviews=[],
        teaching=15, online=6, mentored=2400, selections=28, response=10,
        expertise={"prelims": ["Geography", "Mapping", "Environment", "Agriculture"],
                   "gs1": ["Geography"], "gs3": ["Environment", "Agriculture",
                                                 "Disaster Management"]},
        optionals=["Geography"],
        services=[V(700, [TAG_DOUBTS, TAG_PRELIMS, TAG_MAINS]), O(90, 48), L(1200)],
        slots=[(0, "07:00", "09:00"), (1, "07:00", "09:00"), (3, "19:00", "21:00"),
               (6, "09:00", "12:00")],
        max_copies=6, rating=(4.6, 73),
    ),
    dict(
        legal_name="Arjun Bhattacharya", display_name="Arjun Bhattacharya",
        email="arjun@nexus.in", city="Kolkata", category="faculty",
        headline="Indian Economy & the Budget · ex-RBI research associate",
        philosophy="I spent four years reading monetary policy for a living. Sessions track "
                   "the Economic Survey and the Budget line by line, and I keep a running "
                   "sheet of the data points that actually show up in Prelims. If a number "
                   "has never been asked, we skip it.",
        employment_status="Independent Mentor", qualification="Post Graduate (Masters)",
        university="Delhi School of Economics",
        credentials="Ex-RBI research associate (4 years) · CFA Level II · "
                    "Prelims cleared thrice, Mains twice",
        attempts=3, prelims=[2018, 2019, 2021], mains=[2019, 2021], interviews=[2021],
        teaching=7, online=6, mentored=1100, selections=19, response=8,
        expertise={"prelims": ["Economy", "Agriculture", "Science & Technology"],
                   "gs3": ["Economy", "Agriculture", "Science & Technology"],
                   "essay": ["Thematic"]},
        optionals=["Economics"],
        services=[V(600, [TAG_DOUBTS, TAG_PRELIMS, TAG_MAINS]), O(70, 48),
                  R(9200, "Economy from Zero",
                    "4 concept calls + 18 evaluations + Budget and Survey decode notes.", 4, 18)],
        slots=[(1, "20:00", "22:00"), (2, "20:00", "22:00"), (4, "20:00", "22:00"),
               (5, "15:00", "19:00")],
        max_copies=8, rating=(4.7, 52),
    ),
    dict(
        legal_name="Dr. Farhan Qureshi", display_name="Dr. Farhan Qureshi",
        email="farhan@nexus.in", city="Hyderabad", category="faculty",
        headline="Modern & Medieval History · sources, not summaries",
        philosophy="History marks come from specificity. I teach with primary sources and "
                   "timelines you can reproduce under exam pressure, and I mark your answers "
                   "against the actual UPSC key words rather than a model answer you will "
                   "never remember.",
        employment_status="Full-time Faculty", qualification="PhD",
        university="University of Hyderabad",
        credentials="UGC-NET & JRF · ICHR research fellowship · 9 publications on Deccan "
                    "medieval administration",
        attempts=1, prelims=[2014], mains=[], interviews=[],
        teaching=11, online=5, mentored=1500, selections=22, response=14,
        expertise={"prelims": ["Modern History", "Art & Culture"],
                   "gs1": ["Modern History", "Art & Culture", "Post-Independence",
                           "World History"]},
        optionals=["History"],
        services=[V(650, [TAG_DOUBTS, TAG_MAINS]), O(80, 72)],
        slots=[(0, "17:00", "20:00"), (2, "17:00", "20:00"), (4, "17:00", "20:00"),
               (6, "14:00", "18:00")],
        max_copies=5, rating=(4.5, 66),
    ),
    dict(
        legal_name="Rohit Nair", display_name="Rohit Nair",
        email="rohit@nexus.in", city="Kochi", category="veteran",
        headline="CSAT Paper II & Science-Tech · engineer turned mentor",
        philosophy="Paper II is a qualifying paper people fail by three marks. We fix that "
                   "with timed sets and shortcut drills, not theory. I also cover the science "
                   "and technology current affairs that GS-III has been leaning on.",
        employment_status="Private Sector", qualification="Graduate (Bachelors)",
        university="NIT Surathkal",
        credentials="Ex-software engineer, 5 years · Prelims cleared thrice · "
                    "Mains 2022 · B.Tech Computer Science",
        attempts=3, prelims=[2020, 2021, 2022], mains=[2022], interviews=[],
        teaching=5, online=9, mentored=1300, selections=11, response=6,
        expertise={"prelims": ["Science & Technology", "Economy", "Environment"],
                   "gs3": ["Science & Technology", "Internal Security"]},
        optionals=[],
        services=[V(380, [TAG_PRELIMS, TAG_DOUBTS, TAG_PLAN]), O(40, 48)],
        slots=[(0, "21:00", "23:00"), (2, "21:00", "23:00"), (4, "21:00", "23:00"),
               (5, "16:00", "20:00")],
        max_copies=10, rating=(4.4, 58),
    ),
    dict(
        legal_name="Dr. Kavita Menon", display_name="Dr. Kavita Menon",
        email="kavita@nexus.in", city="Kochi", category="faculty",
        headline="Sociology optional specialist · thinker-wise coverage, 9 years",
        philosophy="Sociology rewards the student who can name the thinker and apply them to "
                   "an Indian example in the same sentence. That is exactly what we drill, "
                   "Paper I and Paper II, with a weekly writing target you cannot dodge.",
        employment_status="Full-time Faculty", qualification="PhD",
        university="Delhi University",
        credentials="UGC-NET · Assistant Professor for 6 years · 12 papers on kinship and "
                    "agrarian change",
        attempts=0, prelims=[], mains=[], interviews=[],
        teaching=13, online=5, mentored=610, selections=24, response=12,
        expertise={"gs1": ["Society"], "gs2": ["Social Justice"], "essay": ["Philosophical"]},
        optionals=["Sociology"],
        services=[V(800, [TAG_DOUBTS, TAG_MAINS]), O(110, 48), L(1400),
                  R(12000, "Sociology Optional — full Paper I",
                    "4 thinker-wise calls + 20 answer evaluations + paper-wise test plan.",
                    4, 20)],
        slots=[(1, "16:00", "19:00"), (3, "16:00", "19:00"), (6, "10:00", "14:00")],
        max_copies=6, rating=(4.8, 41),
    ),
    dict(
        legal_name="Imran Shaikh", display_name="Imran Shaikh",
        email="imran@nexus.in", city="Mumbai", category="veteran",
        headline="Current affairs & newspaper strategy · daily editorial decode",
        philosophy="One hour a day is enough for current affairs if you read the right twenty "
                   "percent. I teach the filter: what to note from the editorial page, what to "
                   "skip, and how to convert it into Prelims facts and Mains examples in the "
                   "same pass.",
        employment_status="Independent Mentor", qualification="Post Graduate (Masters)",
        university="Symbiosis, Pune",
        credentials="7 years as a policy reporter · Prelims cleared twice · "
                    "Runs a 40,000-subscriber current affairs digest",
        attempts=2, prelims=[2019, 2020], mains=[], interviews=[],
        teaching=5, online=5, mentored=2100, selections=14, response=10,
        expertise={"prelims": ["Polity", "Economy", "Environment", "International Relations"],
                   "gs2": ["Governance", "International Relations"], "essay": ["Thematic"]},
        optionals=[],
        services=[V(320, [TAG_PRELIMS, TAG_PLAN, TAG_DOUBTS]), O(35, 48)],
        slots=[(0, "06:30", "08:30"), (1, "06:30", "08:30"), (2, "06:30", "08:30"),
               (3, "06:30", "08:30"), (4, "06:30", "08:30"), (5, "07:00", "10:00")],
        max_copies=15, rating=(4.3, 88),
    ),
    dict(
        legal_name="Dr. Priyanka Yadav", display_name="Dr. Priyanka Yadav",
        email="priyanka@nexus.in", city="Jaipur", category="faculty",
        headline="Ethics case studies & Hindi-medium mentorship",
        philosophy="GS-IV is won on case studies, not definitions. Sessions run in Hindi or "
                   "Hinglish, and every one ends with a case study you attempt and I evaluate "
                   "on the spot against the UPSC marking pattern.",
        employment_status="Full-time Faculty", qualification="PhD",
        university="University of Rajasthan",
        credentials="UGC-NET · 8 years of Hindi-medium coaching · authored a GS-IV case "
                    "study compendium",
        attempts=2, prelims=[2015, 2016], mains=[2016], interviews=[2016],
        teaching=10, online=3, mentored=980, selections=16, response=16,
        expertise={"gs4": ["Ethics Theory", "Case Studies"], "essay": ["Philosophical"],
                   "gs2": ["Governance"]},
        optionals=["Philosophy"],
        services=[V(420, [TAG_MAINS, TAG_DOUBTS]), O(55, 48)],
        slots=[(2, "19:00", "22:00"), (4, "19:00", "22:00"), (5, "11:00", "15:00"),
               (6, "11:00", "15:00")],
        max_copies=9, rating=(4.6, 49),
        languages=["Hindi", "Hinglish", "English"],
    ),
    dict(
        legal_name="Aditya Rane", display_name="Aditya Rane",
        email="aditya@nexus.in", city="Nagpur", category="veteran",
        headline="Public Administration optional · interview-shortlisted twice",
        philosophy="I have written this optional in the exam hall twice, so sessions are built "
                   "around what the paper actually demands: thinkers, Indian administration, "
                   "and the current-affairs bridge in every answer.",
        employment_status="Full-time Aspirant", qualification="Post Graduate (Masters)",
        university="Savitribai Phule Pune University",
        credentials="Interview shortlisted 2021 & 2023 · reserve list AIR 612 · "
                    "Mains qualified three times",
        attempts=4, prelims=[2020, 2021, 2022, 2023], mains=[2021, 2022, 2023],
        interviews=[2021, 2023],
        teaching=4, online=4, mentored=420, selections=8, response=8,
        expertise={"gs2": ["Polity", "Governance", "Social Justice"],
                   "gs4": ["Ethics Theory"], "essay": ["Thematic"]},
        optionals=["Public Administration"],
        services=[V(350, [TAG_MAINS, TAG_DOUBTS, TAG_PLAN]), O(38, 24),
                  R(6400, "PubAd Paper I + II",
                    "4 calls + 20 evaluations returned in 24h + thinker map.", 4, 20)],
        slots=[(0, "20:00", "22:30"), (3, "20:00", "22:30"), (6, "15:00", "19:00")],
        max_copies=12, rating=(4.5, 36),
    ),
    dict(
        legal_name="Harpreet Gill", display_name="Lt. Col. Harpreet Gill (Retd.)",
        email="harpreet@nexus.in", city="Chandigarh", category="faculty",
        headline="Internal security & International Relations · 22 years in uniform",
        philosophy="Security studies taught by someone who served on the Line of Control and "
                   "in a UN mission. We cover the GS-III security syllabus and the IR "
                   "questions that keep repeating, with the operational detail that makes an "
                   "answer stand out from a newspaper summary.",
        employment_status="Independent Mentor", qualification="Post Graduate (Masters)",
        university="Madras University",
        credentials="22 years Indian Army · UN peacekeeping mission (DR Congo) · Sena Medal · "
                    "M.A. Defence Studies",
        attempts=0, prelims=[], mains=[], interviews=[],
        teaching=6, online=3, mentored=520, selections=13, response=18,
        expertise={"prelims": ["International Relations", "Polity"],
                   "gs2": ["International Relations", "Governance"],
                   "gs3": ["Internal Security", "Disaster Management"], "essay": ["Thematic"]},
        optionals=[],
        services=[V(850, [TAG_DOUBTS, TAG_MAINS]), L(1500)],
        slots=[(1, "10:00", "13:00"), (3, "10:00", "13:00"), (5, "17:00", "20:00")],
        max_copies=0, rating=(4.7, 31),
    ),
]

STUDENTS = [
    dict(display_name="Riya Sharma", email="riya@student.in", city="Delhi",
         target_year=2027, attempts=2, optional="Sociology",
         stages=["Standard books completed", "Answer writing phase"],
         graduation="B.A. Economics, Miranda House",
         hurdle="Cleared Prelims 2026 but missed Mains by 24 marks. My GS-II answers score "
                "6 out of 15 even when I know the content — the structure falls apart under "
                "time pressure. I need daily answer writing with someone who will be blunt.",
         languages=["English", "Hinglish"], budget=1200),
    dict(display_name="Karan Verma", email="karan@student.in", city="Kanpur",
         target_year=2027, attempts=0, optional="Public Administration",
         stages=["Just starting / NCERT reading"],
         graduation="B.Tech Mechanical, HBTU",
         hurdle="First attempt and I work a full-time job. I can only study after 9 PM on "
                "weekdays and all day Sunday. I don't know how to sequence the syllabus "
                "around that, and CSAT data interpretation eats my time.",
         languages=["Hindi", "Hinglish"], budget=500),
    dict(display_name="Aisha Fernandes", email="aisha@student.in", city="Goa",
         target_year=2028, attempts=0, optional="Geography",
         stages=["Just starting / NCERT reading", "Standard books completed"],
         graduation="B.Sc. Environmental Science",
         hurdle="Building NCERT foundations. I want to lock my optional early and start "
                "mapwork properly rather than drifting between resources.",
         languages=["English"], budget=800),
]

CHAT_SCRIPTS = [
    [("s", "Good evening ma'am. I've cleared Prelims 2026 but my Mains GS-II answers keep "
           "getting 6 out of 15. Could we work on structure before I buy the retainer?"),
     ("m", "Evening Riya. That score usually means the content is there and the framing "
           "isn't. Send two answers from your last test before Wednesday and book a 60-minute "
           "call — we'll rewrite one live."),
     ("s", "Uploaded both to the copy evaluation just now — the federalism one and RTI."),
     ("m", "Read them. Your federalism answer buries the argument in paragraph three. We fix "
           "intros first: claim in the first line, always. Returned with margin notes."),
     ("s", "That makes so much sense. Booked Wednesday 6 PM and bought the 30-day retainer."),
     ("m", "Good. Bring a blank sheet and the RTI answer. I'll set a daily question on this "
           "thread from tomorrow."),
     ("s", "Thank you ma'am!")],
    [("s", "Sir, I work 9 to 6 and can only study after 9 PM. Is a 10 PM slot workable for CSAT?"),
     ("m", "That's exactly why I keep the 9-11 PM window open on weekdays. Paper II is very "
           "trainable in short sessions."),
     ("s", "My problem is data interpretation — I run out of time on the sets."),
     ("m", "Then we start with timed drills, not theory. Book Monday 9 PM and keep a stopwatch "
           "handy. Send me last year's Paper II too."),
     ("s", "Done sir. Anything else to bring?"),
     ("m", "Your rough sheets. How you write your working is usually where the time goes.")],
]

REVIEWS = [
    (5, "Structured, blunt, and every doubt got answered. My GS-2 intros improved within three "
        "copies. The 48-hour SLA was never missed once."),
    (5, "Worth every rupee. The recording let me re-watch the answer breakdown the same night."),
    (5, "I booked anonymously because I was in a bad place about my third attempt. Zero "
        "judgement, and I had a workable weekly plan by the end of the call."),
    (4, "Very good on concepts. Would have liked a couple more PYQs, but the mapwork approach "
        "finally made physical geography stick."),
    (5, "Returned 16 copies in 24 hours each, with margin annotations rather than a generic "
        "rubric. This is what I was looking for."),
]


def seed_if_empty() -> bool:
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return False
        random.seed(11)
        now = now_ist()

        # ------------------------------------------------------- mentors
        mentor_users: dict[str, User] = {}
        for idx, spec in enumerate(MENTORS):
            user = User(
                email=spec["email"], password_hash=hash_password(DEMO_PASSWORD), role="mentor",
                legal_name=spec["legal_name"], display_name=spec["display_name"],
                mobile=f"+91 9{random.randint(100000000, 999999999)}", city=spec["city"],
                avatar_hue=(idx * 41 + 210) % 360,
                email_verified=True, mobile_verified=True, accepted_terms=True,
                created_at=now - timedelta(days=random.randint(60, 420)),
            )
            db.add(user)
            db.flush()

            rating, count = spec["rating"]
            profile = MentorProfile(
                user_id=user.id, category=spec["category"], headline=spec["headline"],
                philosophy=spec["philosophy"], employment_status=spec["employment_status"],
                languages=spec.get("languages", ["English", "Hindi"]),
                total_attempts=spec["attempts"],
                prelims_cleared_years=spec["prelims"], mains_cleared_years=spec["mains"],
                interview_years=spec["interviews"],
                has_final_rank=bool(spec.get("rank")), final_rank=spec.get("rank"),
                service_allocated=spec.get("service", ""), batch_year=spec.get("batch"),
                mains_marksheet="seeded-marksheet.pdf" if spec["mains"] else "",
                interview_admit_card="seeded-admit-card.pdf" if spec["interviews"] else "",
                highest_qualification=spec["qualification"], university=spec["university"],
                other_credentials=spec["credentials"],
                teaching_years=spec["teaching"], online_teaching_years=spec["online"],
                students_mentored=spec["mentored"], selections_produced=spec["selections"],
                expertise=spec["expertise"], optional_subjects=spec["optionals"],
                aadhaar_masked=f"XXXX XXXX {random.randint(1000, 9999)}",
                pan_masked=f"{''.join(random.choices('ABCDEFGHJK', k=3))}XXXX{random.choice('ABCDEFG')}",
                aadhaar_front="seeded.jpg", aadhaar_back="seeded.jpg", pan_doc="seeded.jpg",
                bank_holder=spec["legal_name"],
                bank_account_masked=f"XXXXXXXX{random.randint(1000, 9999)}",
                bank_ifsc=f"{''.join(random.choices('ABCDEFGHIJK', k=4))}0{random.randint(100000, 999999)}",
                bank_type="Savings", bank_proof="seeded.jpg",
                agreed_escrow=True, agreed_sla=True, agreed_nda=True, agreed_commission=True,
                max_daily_copies=spec["max_copies"],
                verification_status="verified", verified_at=now - timedelta(days=30),
                submitted_at=now - timedelta(days=32), is_listed=True,
                rating_sum=int(round(rating * count)), rating_count=count,
                orders_completed=random.randint(14, 210), response_hours=spec["response"],
            )
            db.add(profile)
            db.flush()

            for kind, price, extra in spec["services"]:
                db.add(MentorService(mentor_id=profile.id, kind=kind, is_active=True,
                                     price=price, **extra))
            for kind in ("video_1on1", "offline_eval", "live_eval", "retainer"):
                if not any(k == kind for k, _p, _e in spec["services"]):
                    db.add(MentorService(mentor_id=profile.id, kind=kind, is_active=False,
                                         price=0))
            for dow, start, end in spec["slots"]:
                db.add(AvailabilitySlot(
                    mentor_id=profile.id, day_of_week=dow,
                    day_type="weekend" if dow >= 5 else "weekday",
                    start_time=start, end_time=end))
            mentor_users[spec["email"]] = user

        # a blackout so the calendar shows the feature working
        ananya = mentor_users["ananya@nexus.in"]
        db.add(BlackoutDate(mentor_id=ananya.mentor.id,
                            date=(now + timedelta(days=9)).date().isoformat(),
                            reason="Conference — unavailable"))

        # ------------------------------------------------------ students
        student_users: list[User] = []
        for idx, spec in enumerate(STUDENTS):
            user = User(
                email=spec["email"], password_hash=hash_password(DEMO_PASSWORD), role="student",
                legal_name=spec["display_name"], display_name=spec["display_name"],
                mobile=f"+91 8{random.randint(100000000, 999999999)}", city=spec["city"],
                avatar_hue=(idx * 88 + 15) % 360,
                email_verified=True, mobile_verified=True, accepted_terms=True,
                created_at=now - timedelta(days=random.randint(20, 140)),
            )
            db.add(user)
            db.flush()
            db.add(StudentProfile(
                user_id=user.id, target_year=spec["target_year"],
                previous_attempts=spec["attempts"], optional_subject=spec["optional"],
                preparation_stages=spec["stages"], biggest_hurdle=spec["hurdle"],
                graduation=spec["graduation"], languages=spec["languages"],
                budget_per_session=spec["budget"]))
            student_users.append(user)
        db.flush()

        riya, karan, aisha = student_users
        vikram = mentor_users["vikram@nexus.in"]
        aarav = mentor_users["aarav@nexus.in"]
        sneha = mentor_users["sneha@nexus.in"]
        nandini = mentor_users["nandini@nexus.in"]
        meera = mentor_users["meera@nexus.in"]
        rohit = mentor_users["rohit@nexus.in"]
        arjun = mentor_users["arjun@nexus.in"]

        ref_counter = {"n": 0}

        def ref() -> str:
            ref_counter["n"] += 1
            return f"NX-{100000 + ref_counter['n'] * 7717:06d}"[:9]

        def price_of(mentor: User, kind: str) -> MentorService:
            return next(s for s in mentor.mentor.services if s.kind == kind)

        def slot_at(days_ahead: int, hour: int, minute: int = 0):
            return (now + timedelta(days=days_ahead)).replace(
                hour=hour, minute=minute, second=0, microsecond=0)

        def mk(student: User, mentor: User, kind: str, **kw) -> Order:
            order = Order(reference=ref(), student_id=student.id, mentor_id=mentor.id,
                          service_kind=kind, **kw)
            db.add(order)
            db.flush()
            return order

        made: list[Order] = []

        # ---- video sessions across every lifecycle state ---------------
        svc = price_of(ananya, "video_1on1")
        o = mk(riya, ananya, "video_1on1", title="60-minute mentorship call",
               subject="GS-2 · Governance", quantity=2, unit_price=svc.price,
               amount=svc.price * 2, start_at=slot_at(2, 18), end_at=slot_at(2, 19),
               duration_minutes=60, status="confirmed",
               meeting_link="https://room.upscnexus.local/NX-DEMO01",
               agenda="Please review the federalism answer I sent through copy evaluation and "
                      "rebuild the intro with me.",
               mentor_note="Bring a blank sheet and the RTI answer.",
               decided_at=now - timedelta(days=1), created_at=now - timedelta(days=2))
        capture(db, o); made.append(o)

        # one starting in 3 minutes so the Join button is live on first load
        o = mk(riya, sneha, "video_1on1", title="30-minute answer clinic",
               subject="Answer writing", quantity=1, unit_price=price_of(sneha, "video_1on1").price,
               amount=price_of(sneha, "video_1on1").price,
               start_at=now + timedelta(minutes=3), end_at=now + timedelta(minutes=33),
               duration_minutes=30, status="confirmed",
               meeting_link="https://room.upscnexus.local/NX-LIVE01",
               agenda="Quick review of today's 15-marker on social justice.",
               decided_at=now - timedelta(hours=20), created_at=now - timedelta(days=1))
        capture(db, o); made.append(o)

        # delivered → sitting in escrow, awaiting the student's approval
        o = mk(riya, vikram, "video_1on1", title="90-minute mock interview",
               subject="Personality Test", quantity=3, unit_price=price_of(vikram, "video_1on1").price,
               amount=price_of(vikram, "video_1on1").price * 3,
               start_at=now - timedelta(days=1, hours=4), end_at=now - timedelta(days=1, hours=2, minutes=30),
               duration_minutes=90, status="delivered",
               meeting_link="https://room.upscnexus.local/NX-MOCK01",
               agenda="First mock. DAF attached in chat.",
               mentor_note="Strong on Sociology, thin on Delhi-specific governance. Notes sent.",
               decided_at=now - timedelta(days=3), created_at=now - timedelta(days=4))
        capture(db, o); mark_delivered(db, o)
        o.delivered_at = now - timedelta(hours=26)
        o.auto_release_at = o.delivered_at + timedelta(hours=72)
        made.append(o)
        delivered_mock = o

        # anonymous booking with Nandini — completed and released
        o = mk(riya, nandini, "video_1on1", title="30-minute reset call",
               subject="Stress & planning", quantity=1,
               unit_price=price_of(nandini, "video_1on1").price,
               amount=price_of(nandini, "video_1on1").price,
               start_at=now - timedelta(days=9), end_at=now - timedelta(days=9) + timedelta(minutes=30),
               duration_minutes=30, status="approved", is_anonymous=True, anon_handle="#7C3A",
               agenda="I have not opened a book in three weeks and the attempt is in June.",
               meeting_link="https://room.upscnexus.local/NX-ANON01",
               decided_at=now - timedelta(days=10), created_at=now - timedelta(days=11))
        capture(db, o); mark_delivered(db, o)
        o.delivered_at = now - timedelta(days=9)
        release(db, o, "Approved by the student")
        made.append(o)
        anon_order = o

        # pending requests for the demo mentor
        o = mk(riya, ananya, "video_1on1", title="30-minute doubt clearing",
               subject="Centre-State financial relations", quantity=1, unit_price=svc.price,
               amount=svc.price, start_at=slot_at(4, 19), end_at=slot_at(4, 19, 30),
               duration_minutes=30, status="pending",
               agenda="Eleven marked questions from the last test on the GST Council and "
                      "Finance Commission devolution. Can we go through them?",
               created_at=now - timedelta(hours=6))
        capture(db, o); made.append(o)

        o = mk(karan, ananya, "video_1on1", title="60-minute planning call",
               subject="Timetable", quantity=2, unit_price=svc.price, amount=svc.price * 2,
               start_at=slot_at(6, 11), end_at=slot_at(6, 12), duration_minutes=60,
               status="pending",
               agenda="Working 9-6. I need a weekly timetable I can actually follow and a way "
                      "to keep current affairs under an hour a day.",
               created_at=now - timedelta(hours=3))
        capture(db, o); made.append(o)

        o = mk(karan, rohit, "video_1on1", title="30-minute CSAT drill",
               subject="CSAT · Data Interpretation", quantity=1,
               unit_price=price_of(rohit, "video_1on1").price,
               amount=price_of(rohit, "video_1on1").price,
               start_at=slot_at(3, 21), end_at=slot_at(3, 21, 30), duration_minutes=30,
               status="confirmed", meeting_link="https://room.upscnexus.local/NX-CSAT01",
               agenda="Timed sets — I lose 8 minutes per set on DI.",
               decided_at=now - timedelta(hours=30), created_at=now - timedelta(days=2))
        capture(db, o); made.append(o)

        o = mk(aisha, meera, "video_1on1", title="30-minute mapwork intro",
               subject="Geography · Mapping", quantity=1,
               unit_price=price_of(meera, "video_1on1").price,
               amount=price_of(meera, "video_1on1").price,
               start_at=slot_at(5, 7), end_at=slot_at(5, 7, 30), duration_minutes=30,
               status="pending", agenda="Want to start mapwork properly from a blank outline.",
               created_at=now - timedelta(hours=11))
        capture(db, o); made.append(o)

        # ---- live copy evaluation --------------------------------------
        make_pdf(COPIES_DIR / "seed_gs2_copy.pdf", "GS-2 Mains Answer — Riya Sharma", [
            "# Q. Cooperative federalism is under strain in fiscal matters. Examine. (15 marks)",
            "",
            "India's federal structure is described as quasi-federal, and the fiscal",
            "arrangement under Articles 268-281 places most elastic sources of revenue",
            "with the Union while expenditure responsibility sits with the States.",
            "",
            "# Areas of strain",
            "1. GST Council voting weights leave States structurally outvoted.",
            "2. Cess and surcharge are outside the divisible pool, shrinking transfers.",
            "3. Delayed compensation payments during the pandemic strained trust.",
            "4. Centrally Sponsored Schemes tie State spending to Union priorities.",
            "",
            "# Way forward",
            "Strengthen the Inter-State Council, cap cess as a share of gross revenue, and",
            "let the Finance Commission examine vertical devolution beyond 41 per cent.",
            "",
            "Conclusion: fiscal federalism needs institutional arbitration, not goodwill.",
        ])
        o = mk(riya, ananya, "live_eval", title="45-minute live copy review",
               subject="GS-2 · Federalism", quantity=1,
               unit_price=price_of(ananya, "live_eval").price,
               amount=price_of(ananya, "live_eval").price,
               start_at=slot_at(5, 20), end_at=slot_at(5, 20, 45), duration_minutes=45,
               status="confirmed", meeting_link="https://room.upscnexus.local/NX-LIVEEV",
               upload_name="GS2_federalism_answer.pdf", upload_stored="seed_gs2_copy.pdf",
               agenda="Rebuild this answer with me on the whiteboard.",
               decided_at=now - timedelta(hours=12), created_at=now - timedelta(days=1))
        capture(db, o); made.append(o)

        # ---- offline copy evaluations, every status --------------------
        make_pdf(COPIES_DIR / "seed_essay_copy.pdf", "Essay — Riya Sharma", [
            "# Essay: Courage is not the absence of fear",
            "",
            "In 1930, a fifty-nine year old lawyer walked two hundred and forty miles to",
            "pick up a fistful of salt. He was afraid of arrest; he walked anyway.",
            "",
            "# Structure notes needed",
            "The introduction runs to nine lines before the thesis appears.",
            "Paragraph four repeats the argument of paragraph two.",
        ])
        make_pdf(COPIES_DIR / "seed_essay_checked.pdf", "Essay — EVALUATED · Sneha Deshpande", [
            "# Marks: 118 / 250   (Essay Paper equivalent)",
            "",
            "# What worked",
            "The Dandi opening is the best thing in this copy. Concrete, dated, specific.",
            "Your command of examples across three domains is genuinely above average.",
            "",
            "# What cost you marks",
            "1. Thesis arrives in line nine. Move it to line two. Non-negotiable.",
            "2. Para 4 restates para 2 — you lost 140 words to repetition.",
            "3. No counter-view anywhere. Add one paragraph that argues against you.",
            "4. Conclusion moralises. End on the argument, not on advice to the reader.",
            "",
            "# Rewrite target for the next copy",
            "Claim in line two. One counter-view paragraph. Cut all adverbs.",
            "Send the rewrite within four days and I will check it against this one.",
        ])
        submitted = now - timedelta(days=5)
        o = mk(riya, sneha, "offline_eval", title="1 answer · copy evaluation",
               subject="Essay", quantity=1, unit_price=price_of(sneha, "offline_eval").price,
               amount=price_of(sneha, "offline_eval").price,
               upload_name="Essay_courage.pdf", upload_stored="seed_essay_copy.pdf",
               sla_hours=24, sla_deadline=submitted + timedelta(hours=24),
               returned_name="Essay_courage_CHECKED.pdf", returned_stored="seed_essay_checked.pdf",
               evaluator_feedback="Thesis placement is the single biggest leak. Fix that and "
                                  "this is a 130+ copy. Full notes in the PDF margins.",
               marks_awarded=118, marks_total=250, status="approved",
               created_at=submitted)
        capture(db, o); mark_delivered(db, o)
        o.delivered_at = submitted + timedelta(hours=19)
        release(db, o, "Approved by the student")
        made.append(o)
        approved_eval = o

        # ready → downloadable, awaiting approval, inside escrow window
        make_pdf(COPIES_DIR / "seed_gs2_checked.pdf", "GS-2 Answer — EVALUATED · Dr. Ananya R.", [
            "# Marks: 11 / 15",
            "",
            "# Structure",
            "Your claim is in paragraph three. In a 15-marker the examiner has decided",
            "your band by the end of line two. Lead with the verdict, then evidence.",
            "",
            "# Content",
            "Good: Articles 268-281 cited correctly; cess-outside-divisible-pool is the",
            "strongest point in the copy and you made it concretely.",
            "Missing: 15th Finance Commission's 41 per cent figure. Add the number.",
            "Missing: Article 293(3) on State borrowing consent — very askable.",
            "",
            "# Way forward section",
            "Solid, but 'strengthen the Inter-State Council' needs a mechanism.",
            "Say what would change: statutory backing, fixed meeting calendar.",
            "",
            "# Next copy",
            "Same question, 150 words, claim in line two. Send by Friday.",
        ])
        submitted2 = now - timedelta(hours=30)
        o = mk(riya, ananya, "offline_eval", title="2 answers · copy evaluation",
               subject="GS-2 · Governance", quantity=2,
               unit_price=price_of(ananya, "offline_eval").price,
               amount=price_of(ananya, "offline_eval").price * 2,
               upload_name="GS2_federalism_RTI.pdf", upload_stored="seed_gs2_copy.pdf",
               sla_hours=48, sla_deadline=submitted2 + timedelta(hours=48),
               returned_name="GS2_federalism_CHECKED.pdf", returned_stored="seed_gs2_checked.pdf",
               evaluator_feedback="Claim in line two, always. Add the 41 per cent devolution "
                                  "figure and Article 293(3). Rewrite and resend by Friday.",
               marks_awarded=11, marks_total=15, status="ready", created_at=submitted2)
        capture(db, o); mark_delivered(db, o)
        o.delivered_at = now - timedelta(hours=5)
        o.auto_release_at = o.delivered_at + timedelta(hours=72)
        made.append(o)
        ready_eval = o

        # evaluating, SLA tightening — shows the countdown going red
        make_pdf(COPIES_DIR / "seed_gs3_copy.pdf", "GS-3 Answer — Karan Verma", [
            "# Q. Examine the role of cooperatives in doubling farmer incomes. (10 marks)",
            "",
            "Cooperatives pool small holdings and improve bargaining power. Amul is the",
            "classic example, and the Ministry of Cooperation created in 2021 signals",
            "renewed policy attention.",
            "",
            "(First attempt at a 10-marker. I ran out of time at 110 words.)",
        ])
        submitted3 = now - timedelta(hours=21)
        o = mk(karan, arjun, "offline_eval", title="1 answer · copy evaluation",
               subject="GS-3 · Economy", quantity=1,
               unit_price=price_of(arjun, "offline_eval").price,
               amount=price_of(arjun, "offline_eval").price,
               upload_name="GS3_cooperatives.pdf", upload_stored="seed_gs3_copy.pdf",
               sla_hours=48, sla_deadline=submitted3 + timedelta(hours=48),
               status="evaluating",
               agenda="First 10-marker I have ever written. Be harsh.",
               created_at=submitted3)
        capture(db, o); made.append(o)

        # just submitted
        o = mk(aisha, meera, "offline_eval", title="1 answer · copy evaluation",
               subject="GS-1 · Geography", quantity=1,
               unit_price=price_of(meera, "offline_eval").price,
               amount=price_of(meera, "offline_eval").price,
               upload_name="Geo_monsoon.pdf", upload_stored="seed_gs3_copy.pdf",
               sla_hours=48, sla_deadline=now + timedelta(hours=46),
               status="submitted", created_at=now - timedelta(hours=2))
        capture(db, o); made.append(o)

        # SLA missed → auto-refunded, the guarantee visibly working
        late = now - timedelta(days=4)
        o = mk(karan, rohit, "offline_eval", title="1 answer · copy evaluation",
               subject="GS-3 · Science & Technology", quantity=1,
               unit_price=price_of(rohit, "offline_eval").price,
               amount=price_of(rohit, "offline_eval").price,
               upload_name="GS3_semiconductors.pdf", upload_stored="seed_gs3_copy.pdf",
               sla_hours=48, sla_deadline=late + timedelta(hours=48),
               status="refunded_sla", created_at=late)
        capture(db, o)
        from .escrow import refund as _refund
        _refund(db, o, "Missed the 48h turnaround SLA")
        made.append(o)

        # ---- retainer with credits partly redeemed --------------------
        rsvc = price_of(sneha, "retainer")
        retainer = mk(riya, sneha, "retainer", title=rsvc.package_title,
                      package_title=rsvc.package_title, deliverables=rsvc.deliverables,
                      quantity=1, unit_price=rsvc.price, amount=rsvc.price,
                      session_credits_total=rsvc.session_credits,
                      session_credits_used=1,
                      eval_credits_total=rsvc.eval_credits, eval_credits_used=6,
                      valid_until=now + timedelta(days=17), status="active",
                      created_at=now - timedelta(days=13))
        capture(db, retainer); made.append(retainer)

        # a credit-redeemed evaluation hanging off that retainer
        o = mk(riya, sneha, "offline_eval", title="1 answer · redeemed from retainer",
               subject="GS-4 · Case study", quantity=1, unit_price=0, amount=0,
               paid_with_credit=True, parent_id=retainer.id,
               upload_name="GS4_case_study.pdf", upload_stored="seed_essay_copy.pdf",
               sla_hours=24, sla_deadline=now + timedelta(hours=9),
               status="evaluating", created_at=now - timedelta(hours=15))
        o.escrow_state = "held"
        made.append(o)

        # ---- a dispute in flight --------------------------------------
        o = mk(karan, rohit, "video_1on1", title="30-minute CSAT drill",
               subject="CSAT", quantity=1, unit_price=price_of(rohit, "video_1on1").price,
               amount=price_of(rohit, "video_1on1").price,
               start_at=now - timedelta(days=2, hours=3),
               end_at=now - timedelta(days=2, hours=2, minutes=30),
               duration_minutes=30, status="disputed",
               meeting_link="https://room.upscnexus.local/NX-DISP01",
               decided_at=now - timedelta(days=3), created_at=now - timedelta(days=4))
        capture(db, o); mark_delivered(db, o)
        o.delivered_at = now - timedelta(days=2)
        o.auto_release_at = o.delivered_at + timedelta(hours=72)
        o.escrow_state = "frozen"
        db.add(Dispute(order_id=o.id, raised_by=karan.id,
                       reason="Mentor did not show up.",
                       detail="I waited in the room for 25 minutes and messaged twice. "
                              "The session never started.",
                       created_at=now - timedelta(days=1, hours=20)))
        made.append(o)

        # ---- reviews ---------------------------------------------------
        review_targets = [(approved_eval, REVIEWS[4]), (delivered_mock, REVIEWS[1]),
                          (anon_order, REVIEWS[2])]
        for order, (stars, text) in review_targets:
            db.add(Review(order_id=order.id, student_id=order.student_id,
                          mentor_id=order.mentor_id, rating=stars, comment=text,
                          created_at=(order.delivered_at or now) + timedelta(hours=3)))

        # ---- video vault ----------------------------------------------
        sample = VAULT_DIR / "seed_session_audio.wav"
        if not sample.exists():
            make_audio(sample)

        def add_recording(order: Order, days_ago: float, status: str, label: str,
                          size_mb: float, minutes: int, notes: str):
            uploaded = now - timedelta(days=days_ago)
            stored = f"vault_{order.id}_{random.randrange(16**10):010x}.wav"
            if status == "available":
                (VAULT_DIR / stored).write_bytes(sample.read_bytes())
            elif status == "archived":
                (VAULT_ARCHIVE_DIR / stored).write_bytes(sample.read_bytes()[:4096])
            rec = Recording(
                order_id=order.id, stored_name=stored, label=label,
                content_type="audio/wav", size_bytes=int(size_mb * 1024 * 1024),
                duration_seconds=minutes * 60, notes=notes, uploaded_at=uploaded,
                expires_at=uploaded + timedelta(days=VAULT_STREAM_DAYS),
                purge_at=uploaded + timedelta(days=VAULT_PURGE_DAYS), status=status)
            if status in ("archived", "purged"):
                rec.archived_at = uploaded + timedelta(days=VAULT_STREAM_DAYS)
            if status == "purged":
                rec.purged_at = uploaded + timedelta(days=VAULT_PURGE_DAYS)
            db.add(rec)

        add_recording(delivered_mock, 1.1, "available", "90-minute mock interview · NX-MOCK01",
                      148.2, 90, "Full mock plus the 12-minute debrief at the end.")
        add_recording(anon_order, 3.0, "available", "Reset call · anonymous booking",
                      41.6, 30, "Weekly plan agreed at 18:40.")
        add_recording(made[6], 9.5, "archived", "CSAT drill · NX-CSAT",
                      38.9, 30, "Timed DI sets — archived after the streaming window.")
        add_recording(anon_order, 34.0, "purged", "Earlier reset call",
                      44.1, 30, "Purged on schedule at day 30.")

        # ---- chat ------------------------------------------------------
        for (student, mentor), script in zip([(riya, ananya), (karan, rohit)], CHAT_SCRIPTS):
            thread = Thread(student_id=student.id, mentor_id=mentor.id,
                            created_at=now - timedelta(days=12))
            db.add(thread)
            db.flush()
            stamp = now - timedelta(days=12)
            for who, body in script:
                stamp += timedelta(hours=random.randint(3, 11))
                db.add(Message(thread_id=thread.id,
                               sender_id=student.id if who == "s" else mentor.id,
                               body=body, created_at=stamp,
                               read_at=stamp + timedelta(minutes=random.randint(4, 120))))
            thread.last_message_at = stamp

        # threads for the other pairings so the workspace isn't empty
        for student, mentor in [(riya, sneha), (riya, vikram), (riya, nandini),
                                (karan, arjun), (karan, ananya), (aisha, meera)]:
            if db.query(Thread).filter(Thread.student_id == student.id,
                                       Thread.mentor_id == mentor.id).first():
                continue
            thread = Thread(student_id=student.id, mentor_id=mentor.id,
                            created_at=now - timedelta(days=6),
                            last_message_at=now - timedelta(days=6))
            db.add(thread)
            db.flush()
            db.add(Message(thread_id=thread.id, sender_id=student.id,
                           body="Hi! I've just booked with you — looking forward to it.",
                           created_at=now - timedelta(days=6),
                           read_at=now - timedelta(days=6) + timedelta(hours=2)))

        # one unread message so the badge is visible immediately
        thread = (db.query(Thread)
                  .filter(Thread.student_id == riya.id, Thread.mentor_id == ananya.id).first())
        last = now - timedelta(minutes=22)
        db.add(Message(thread_id=thread.id, sender_id=ananya.id, created_at=last,
                       body="Your checked copy is back — 11/15. The whole leak is thesis "
                            "placement. Rewrite the same question in 150 words and send it "
                            "before Friday's call."))
        thread.last_message_at = last

        # ---- notifications --------------------------------------------
        db.add_all([
            Notification(user_id=riya.id, kind="message", link="chat",
                         title="Message from Dr. Ananya R.",
                         body="Your checked copy is back — 11/15.",
                         created_at=last),
            Notification(user_id=riya.id, kind="success", link="orders",
                         title="Evaluation ready",
                         body="GS-2 · Governance returned with 11/15. Approve to release payment.",
                         created_at=now - timedelta(hours=5)),
            Notification(user_id=riya.id, kind="info", link="orders",
                         title="Mock interview delivered",
                         body="Approve NX-MOCK01 or raise an issue — auto-releases in 46 hours.",
                         created_at=now - timedelta(hours=26)),
            Notification(user_id=riya.id, kind="success", link="vault",
                         title="Recording in your vault",
                         body="90-minute mock interview is streamable for 7 days.",
                         created_at=now - timedelta(days=1)),
            Notification(user_id=ananya.id, kind="request", link="requests",
                         title="2 new session requests",
                         body="Riya Sharma and Karan Verma are waiting on confirmation.",
                         created_at=now - timedelta(hours=3)),
            Notification(user_id=ananya.id, kind="success", link="earnings",
                         title="₹204 cleared escrow",
                         body="NX-100007 released after the 72-hour window.",
                         created_at=now - timedelta(days=2)),
            Notification(user_id=rohit.id, kind="warning", link="orders",
                         title="Dispute raised",
                         body="Karan Verma reported a no-show on NX. Funds are frozen.",
                         created_at=now - timedelta(days=1, hours=20)),
            Notification(user_id=sneha.id, kind="request", link="queue",
                         title="Retainer copy waiting",
                         body="GS-4 case study due back in 9 hours.",
                         created_at=now - timedelta(hours=15)),
        ])

        # ---- align the ledger with each order's real timeline ----------
        # capture/release entries are written as the seed runs, so without this
        # every money movement would read "just now" in the UI.
        db.flush()
        from .models import LedgerEntry
        for entry in db.query(LedgerEntry).all():
            order = db.get(Order, entry.order_id)
            if not order:
                continue
            stamp = {
                "captured": order.created_at,
                "delivered": order.delivered_at or order.created_at,
                "released": order.released_at or order.delivered_at,
                "refunded": order.refunded_at or order.created_at,
                "liquidated": order.released_at,
                "frozen": order.dispute.created_at if order.dispute else order.delivered_at,
            }.get(entry.kind)
            if stamp:
                entry.created_at = stamp

        db.commit()
        print(f"[seed] {len(MENTORS)} mentors, {len(STUDENTS)} aspirants, "
              f"{db.query(Order).count()} orders, {db.query(Recording).count()} recordings, "
              f"{db.query(Message).count()} messages, {db.query(Dispute).count()} dispute")
        return True
    finally:
        db.close()
