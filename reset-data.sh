#!/usr/bin/env bash
# Wipe the database tables and stored media, then let the API re-seed on next boot.
# Drops every application table on the Postgres/Supabase database from .env.
set -euo pipefail
cd "$(dirname "$0")"

(cd backend && ../.venv/bin/python reset_db.py "$@")

rm -rf backend/storage/vault backend/storage/vault_archive backend/storage/copies \
       backend/storage/kyc backend/storage/media 2>/dev/null || true
echo "Data reset. Restart the API (./start.sh) and the 14 mentors + 3 aspirants are re-seeded."
