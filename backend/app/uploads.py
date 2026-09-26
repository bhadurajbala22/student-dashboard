"""Small, shared upload helpers for user-owned media."""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile


def save_upload(
    file: UploadFile,
    folder: Path,
    prefix: str,
    max_mb: int,
    allowed: set[str] | None = None,
) -> str:
    suffix = Path(file.filename or "").suffix.lower()
    valid = allowed or {".jpg", ".jpeg", ".png", ".pdf", ".webp", ".mp4", ".webm", ".mov"}
    if suffix not in valid:
        raise HTTPException(400, f"Unsupported file type '{suffix}'")

    stored = f"{prefix}_{uuid.uuid4().hex[:10]}{suffix}"
    target = folder / stored
    limit = max_mb * 1024 * 1024
    written = 0
    with target.open("wb") as fh:
        while chunk := file.file.read(1024 * 1024):
            written += len(chunk)
            if written > limit:
                fh.close()
                target.unlink(missing_ok=True)
                raise HTTPException(413, f"File exceeds the {max_mb} MB limit")
            fh.write(chunk)
    return stored
