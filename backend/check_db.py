#!/usr/bin/env python
"""Verify the database connection before starting the app.

    ../.venv/bin/python check_db.py            # connect, report, leave data alone
    ../.venv/bin/python check_db.py --tables   # also list tables and row counts

Exits non-zero if the database cannot be reached, so it can gate a deploy.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import DATABASE_URL, DB_BACKEND, safe_db_url   # noqa: E402
from app.envfile import ENV_CANDIDATES, LOADED_ENV_FILES       # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tables", action="store_true", help="list tables and row counts")
    args = ap.parse_args()

    if LOADED_ENV_FILES:
        print(f"env loaded from : {', '.join(LOADED_ENV_FILES)}")
    else:
        print("env loaded from : nothing found. Looked in:")
        for c in ENV_CANDIDATES:
            print(f"                  {c}")

    print(f"backend         : {DB_BACKEND}")
    print(f"dsn             : {safe_db_url()}")
    if DB_BACKEND == "sqlite":
        print("\nStill on SQLite. Set DATABASE_URL in .env to use Postgres/Supabase.")

    from sqlalchemy import inspect, text            # noqa: E402
    from app.db import engine                        # noqa: E402

    try:
        with engine.connect() as conn:
            if DB_BACKEND == "postgresql":
                version = conn.execute(text("SHOW server_version")).scalar()
                who, db = conn.execute(text("SELECT current_user, current_database()")).one()
                print(f"server          : PostgreSQL {version}")
                print(f"connected as    : {who} on {db}")
            else:
                print(f"server          : SQLite {conn.execute(text('SELECT sqlite_version()')).scalar()}")
    except Exception as exc:                         # noqa: BLE001
        print(f"\nCOULD NOT CONNECT: {type(exc).__name__}: {exc}")
        print(_hint(exc))
        return 1

    tables = sorted(inspect(engine).get_table_names())
    print(f"tables          : {len(tables)}" + (f" ({', '.join(tables)})" if tables and not args.tables else ""))
    if not tables:
        print("\nNo tables yet — they are created on first boot of the API.")

    if args.tables and tables:
        print()
        with engine.connect() as conn:
            for t in tables:
                n = conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
                print(f"  {t:<22} {n:>6} rows")

    print("\nOK")
    return 0


def _hint(exc: Exception) -> str:
    """Turn the three failures people actually hit into instructions."""
    msg = str(exc).lower()
    if "password authentication failed" in msg:
        return ("\nThe password is wrong. Supabase dashboard → Project Settings → Database →\n"
                "Reset database password. If it contains @ / # or ?, either percent-encode it\n"
                "in DATABASE_URL or set SUPABASE_DB_PASSWORD + SUPABASE_PROJECT_REF instead.")
    if "network is unreachable" in msg or "could not translate host" in msg:
        return ("\ndb.<ref>.supabase.co resolves to IPv6 only. If this machine or your host has\n"
                "no IPv6, use the pooler instead — Supabase dashboard → Connect → Session pooler,\n"
                "which gives you an IPv4 address on aws-0-<region>.pooler.supabase.com.")
    if "timeout" in msg or "timed out" in msg:
        return ("\nCheck the host and port are right, and that the project is not paused\n"
                "(free Supabase projects pause after a week of inactivity).")
    return ""


if __name__ == "__main__":
    raise SystemExit(main())
