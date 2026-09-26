#!/usr/bin/env bash
# Wipe the database and stored media, then let the API re-seed on next boot.
# Works against SQLite (deletes the file) or Postgres/Supabase (drops the tables).
set -euo pipefail
cd "$(dirname "$0")"

BACKEND=$(cd backend && ../.venv/bin/python -c "from app.config import DB_BACKEND; print(DB_BACKEND)")

if [ "$BACKEND" = "postgresql" ]; then
  (cd backend && ../.venv/bin/python reset_db.py "$@")
else
  rm -f backend/nexus.db
  echo "Dropped the local SQLite database."
fi

rm -rf backend/storage/vault backend/storage/vault_archive backend/storage/copies \
       backend/storage/kyc backend/storage/media 2>/dev/null || true
echo "Data reset. Restart the API (./start.sh) and the 14 mentors + 3 aspirants are re-seeded."
