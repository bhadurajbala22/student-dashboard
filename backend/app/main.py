"""ToppersDeck — verified mentorship, evaluation and strategy marketplace (API)."""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import BASE_DIR, CORS_ORIGINS, MEDIA_DIR, PLATFORM_NAME, PLATFORM_TAGLINE
from .db import Base, engine, ensure_columns
from .escrow import sweep_loop, sweep_once
from .routers import auth, chat, mentors, misc, orders, vault

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s  %(levelname)-7s %(name)s  %(message)s")
log = logging.getLogger("nexus")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from .config import DB_BACKEND, safe_db_url
    log.info("database · %s · %s", DB_BACKEND, safe_db_url())
    Base.metadata.create_all(bind=engine)
    added = ensure_columns()
    if added:
        log.info("schema updated: %s", ", ".join(added))

    from .seed import seed_if_empty
    seed_if_empty()
    sweep_once()
    task = asyncio.create_task(sweep_loop())

    from .notify import settings as NS, shutdown as notify_shutdown
    st = NS.status()
    log.info("notifications · email=%s(%s) sms=%s(%s) meet=%s",
             st["email_provider"], "live" if st["email_configured"] else "console",
             st["sms_provider"], "live" if st["sms_configured"] else "console",
             st["meet_provider"])
    if st["env_files_loaded"]:
        log.info("env loaded from: %s", ", ".join(st["env_files_loaded"]))
    else:
        log.warning("no .env file found — looked in: %s",
                    ", ".join(st["env_files_searched"]))
    if not (st["email_configured"] or st["sms_configured"]):
        log.info("no email/SMS provider configured — OTPs are returned in the API "
                 "response for local use. See ENVIRONMENT.md to send for real.")

    log.info("%s API ready", PLATFORM_NAME)
    yield
    task.cancel()
    notify_shutdown()


app = FastAPI(title=f"{PLATFORM_NAME} API", description=PLATFORM_TAGLINE,
              version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (auth, mentors, orders, vault, chat, misc):
    app.include_router(module.router)

app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")


@app.get("/api/health")
def health():
    return {"status": "ok", "platform": PLATFORM_NAME}


# ---- serve the built SPA when it exists, so one port can serve everything ---
DIST = BASE_DIR.parent / "frontend" / "dist"
if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        if full_path.startswith(("api/", "media/")):
            return JSONResponse({"detail": "Not found"}, status_code=404)
        candidate = DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
