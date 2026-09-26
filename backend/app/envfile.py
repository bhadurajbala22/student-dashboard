"""Loads `.env` once, for every module that needs configuration.

The database URL and the notification credentials live in the same file, so if
each module did its own loading the winner would depend on import order. Doing
it here means `config.py` and `notify/settings.py` always agree on what was
read — and the startup diagnostics can report a single honest answer.
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent      # <repo>/backend
PROJECT_ROOT = BASE_DIR.parent                         # <repo>

# Every location someone might reasonably put the file. Earlier entries win:
# load_dotenv(override=False) never replaces a value already set, and a real
# environment variable always beats the file.
# dict.fromkeys de-duplicates while keeping order — running from backend/ would
# otherwise list the same path twice in the diagnostics.
ENV_CANDIDATES = list(dict.fromkeys([
    BASE_DIR / ".env",           # backend/.env
    PROJECT_ROOT / ".env",       # <repo>/.env   ← what the docs recommend
    Path.cwd() / ".env",         # wherever the process was started
]))

LOADED_ENV_FILES: list[str] = []
for _candidate in ENV_CANDIDATES:
    if _candidate.is_file() and str(_candidate) not in LOADED_ENV_FILES:
        load_dotenv(_candidate, override=False)
        LOADED_ENV_FILES.append(str(_candidate))


def env(key: str, default: str = "") -> str:
    return (os.getenv(key) or default).strip()


def env_bool(key: str, default: bool) -> bool:
    raw = env(key)
    return default if not raw else raw.lower() in ("1", "true", "yes", "on")
