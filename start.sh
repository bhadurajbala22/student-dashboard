#!/usr/bin/env bash
# ToppersDeck — start the API and the React dev server together.
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$PWD"

# Node from nvm if it isn't already on PATH
if ! command -v node >/dev/null 2>&1; then
  for d in "$HOME/.nvm/versions/node"/*/bin; do [ -d "$d" ] && export PATH="$d:$PATH"; done
fi

command -v node >/dev/null || { echo "node not found — install Node 20+ and retry"; exit 1; }
[ -d .venv ] || { echo "Missing .venv — see README.md → Setup from scratch"; exit 1; }
[ -d frontend/node_modules ] || (cd frontend && npm install)

cleanup() { echo; echo "Stopping…"; kill 0 2>/dev/null || true; }
trap cleanup EXIT INT TERM

echo "→ API      http://127.0.0.1:8000  (docs at /docs)"
( cd backend && exec "$ROOT/.venv/bin/python" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload ) &

sleep 2
echo "→ Portal   http://localhost:5173"
( cd frontend && exec npm run dev ) &

wait
