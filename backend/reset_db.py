#!/usr/bin/env python
"""Drop every application table so the next boot re-seeds.

    ../.venv/bin/python reset_db.py          # asks before touching Postgres
    ../.venv/bin/python reset_db.py --yes    # for scripts

On SQLite this is the same as deleting the file. On Postgres it is not: the
database is remote and shared, and there is no undo, so a pointed confirmation
is required unless --yes is passed.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import DB_BACKEND, safe_db_url   # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--yes", action="store_true", help="skip the confirmation prompt")
    args = ap.parse_args()

    from sqlalchemy import inspect                # noqa: E402
    from app import models                        # noqa: E402,F401  (registers the tables)
    from app.db import Base, engine               # noqa: E402

    tables = sorted(inspect(engine).get_table_names())
    print(f"target : {DB_BACKEND} · {safe_db_url()}")
    print(f"tables : {len(tables)}")
    if not tables:
        print("Nothing to drop.")
        return 0

    if DB_BACKEND == "postgresql" and not args.yes:
        host = safe_db_url().split("@")[-1].split("/")[0]
        print(f"\nThis permanently deletes all {len(tables)} tables on {host}.")
        print("There is no undo.")
        if input('Type "drop" to continue: ').strip().lower() != "drop":
            print("Cancelled.")
            return 1

    Base.metadata.drop_all(bind=engine)
    left = inspect(engine).get_table_names()
    # drop_all only knows the tables the models declare; anything else is the
    # user's own and is deliberately left alone.
    print(f"Dropped. {len(left)} table(s) remain" + (f": {', '.join(sorted(left))}" if left else "."))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
