"""Central configuration for the ToppersDeck marketplace backend."""
from pathlib import Path
from urllib.parse import quote_plus, urlsplit, urlunsplit

from .envfile import env

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
VAULT_DIR = STORAGE_DIR / "vault"          # session recordings (internal only)
VAULT_ARCHIVE_DIR = STORAGE_DIR / "vault_archive"
COPIES_DIR = STORAGE_DIR / "copies"        # student answer PDFs + evaluated returns
KYC_DIR = STORAGE_DIR / "kyc"              # identity documents
MEDIA_DIR = STORAGE_DIR / "media"          # profile photos, intro videos

for _d in (STORAGE_DIR, VAULT_DIR, VAULT_ARCHIVE_DIR, COPIES_DIR, KYC_DIR, MEDIA_DIR):
    _d.mkdir(parents=True, exist_ok=True)


# --- Database -------------------------------------------------------------
# The app runs on Postgres (Supabase) only. Set DATABASE_URL in .env, or set
# SUPABASE_PROJECT_REF + SUPABASE_DB_PASSWORD and the URL is built for you.
# There is no local fallback: the app refuses to start without a database.
_MISSING_DB_MESSAGE = (
    "No database configured. Copy .env.example to .env and set DATABASE_URL to your "
    "Supabase connection string (dashboard → Connect → Session pooler), or set "
    "SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD. See ENVIRONMENT.md."
)


def _build_supabase_url() -> str:
    """Assemble a Supabase DSN from its parts.

    Supabase generates passwords containing characters that are structural in a
    URL — `@`, `/`, `#`, `?`. Pasting one into DATABASE_URL unencoded produces a
    DSN that parses into the wrong host and fails with a confusing error, so we
    offer this route as well and do the percent-encoding here.
    """
    password = env("SUPABASE_DB_PASSWORD")
    ref = env("SUPABASE_PROJECT_REF")
    if not (password and ref):
        return ""
    host = env("SUPABASE_DB_HOST", f"db.{ref}.supabase.co")
    port = env("SUPABASE_DB_PORT", "5432")
    user = env("SUPABASE_DB_USER", "postgres" if "pooler" not in host else f"postgres.{ref}")
    return f"postgresql+psycopg://{user}:{quote_plus(password)}@{host}:{port}/postgres"


def _normalise(url: str) -> str:
    """Make a pasted DSN usable, or say plainly why it is not.

    Supabase hands you a `postgresql://` string, but SQLAlchemy needs to be told
    which driver to use, and the connection must be encrypted.
    """
    if not url:
        raise RuntimeError(_MISSING_DB_MESSAGE)
    if "[YOUR-PASSWORD]" in url or "YOUR-PASSWORD" in url:
        raise RuntimeError(
            "DATABASE_URL still contains the [YOUR-PASSWORD] placeholder. Replace it with "
            "your real database password (Supabase dashboard → Project Settings → Database → "
            "Reset database password), or set SUPABASE_DB_PASSWORD and SUPABASE_PROJECT_REF "
            "instead and let the app build the URL for you."
        )
    parts = urlsplit(url)
    scheme = parts.scheme
    # `postgres://` is the legacy spelling; plain `postgresql://` leaves the
    # driver unspecified, which picks psycopg2 — we ship psycopg 3.
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+psycopg"
    if not scheme.startswith("postgresql"):
        raise RuntimeError(
            f"DATABASE_URL must be a PostgreSQL connection string (got scheme '{scheme}'). "
            "The app runs on Postgres/Supabase only."
        )
    if "sslmode=" not in (parts.query or ""):
        # Supabase refuses unencrypted connections; be explicit rather than
        # relying on the driver's default.
        query = f"{parts.query}&sslmode=require" if parts.query else "sslmode=require"
        parts = parts._replace(query=query)
    return urlunsplit((scheme, parts.netloc, parts.path, parts.query, parts.fragment))


DATABASE_URL = _normalise(env("DATABASE_URL") or _build_supabase_url())
DB_BACKEND = "postgresql"


def safe_db_url(url: str = "") -> str:
    """The DSN with the password replaced, safe to log or return over the API."""
    parts = urlsplit(url or DATABASE_URL)
    if not parts.password:
        return url or DATABASE_URL
    netloc = parts.netloc.replace(f":{parts.password}@", ":****@")
    return urlunsplit((parts.scheme, netloc, parts.path, parts.query, parts.fragment))


# --- Auth -----------------------------------------------------------------
# Signing key for login tokens. Required — there is no default so a secret
# can never be committed to the repository.
JWT_SECRET = env("JWT_SECRET")
if len(JWT_SECRET) < 32:
    raise RuntimeError(
        "JWT_SECRET is missing or shorter than 32 characters. Set it in .env "
        "(generate one with: openssl rand -hex 32). See .env.example."
    )
JWT_ALGORITHM = "HS256"
TOKEN_TTL_HOURS = 24 * 7
OTP_TTL_MINUTES = 10

# --- Platform identity ----------------------------------------------------
PLATFORM_NAME = "ToppersDeck"
PLATFORM_TAGLINE = "Verified mentorship, evaluation and strategy for Civil Services aspirants"
TIMEZONE_LABEL = "IST (Asia/Kolkata)"

# --- Business model -------------------------------------------------------
COMMISSION_RATE = 0.15            # platform take-rate; mentor keeps 85%
ESCROW_HOLD_HOURS = 72            # dispute window before auto-release
SLA_CHOICES = [24, 48, 72]        # offline evaluation turnaround options
RETAINER_DEFAULT_DAYS = 30

# --- Video vault / retention ---------------------------------------------
# Sessions are recorded to an internal vault. Neither party can download them;
# the student may stream for a revision window, then the file is archived and
# finally purged. Admin retains access for dispute evidence while it exists.
VAULT_STREAM_DAYS = 7
VAULT_PURGE_DAYS = 30
SWEEP_SECONDS = 900               # escrow + SLA + retention sweep cadence
MAX_UPLOAD_MB = 512
MAX_PDF_MB = 10
MAX_KYC_MB = 5

CORS_ORIGINS = [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:4173", "http://127.0.0.1:4173",
]
