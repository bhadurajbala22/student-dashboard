"""Generators for demo media, so the player and PDF viewers aren't empty.

No ffmpeg or PDF library is available in this environment, so both formats are
written by hand with the standard library.
"""
import math
import struct
import wave
from pathlib import Path


def make_pdf(path: Path, title: str, lines: list[str]) -> None:
    """Write a minimal but completely valid single-page PDF."""
    # The base-14 PDF fonts are Latin-1; fold the typographic characters we
    # actually use down to ASCII so they don't render as "?".
    FOLD = {"\u2014": "-", "\u2013": "-", "\u2018": "'", "\u2019": "'",
            "\u201c": '"', "\u201d": '"', "\u2026": "...", "\u00a0": " ",
            "\u20b9": "Rs."}

    def esc(s: str) -> str:
        for bad, good in FOLD.items():
            s = s.replace(bad, good)
        return s.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")

    content = ["BT", "/F2 16 Tf", "60 780 Td", f"({esc(title)}) Tj", "ET",
               "0.6 g", "60 765 m 535 765 l S", "0 g"]
    y = 740
    for line in lines:
        font = "/F2 11 Tf" if line.startswith("#") else "/F1 11 Tf"
        text = line[1:].strip() if line.startswith("#") else line
        content += ["BT", font, f"60 {y} Td", f"({esc(text[:96])}) Tj", "ET"]
        y -= 18
        if y < 60:
            break
    stream = "\n".join(content).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        (b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R "
         b"/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>"),
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"

    xref_at = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets:
        out += f"{off:010d} 00000 n \n".encode()
    out += (f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n"
            f"{xref_at}\n%%EOF\n").encode()
    path.write_bytes(bytes(out))


def make_audio(path: Path, seconds: int = 8, freq: float = 392.0) -> None:
    """A short playable WAV so the vault player has real media to stream."""
    rate = 22050
    with wave.open(str(path), "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        frames = bytearray()
        total = int(rate * seconds)
        for i in range(total):
            env = min(1.0, i / 3000, (total - i) / 3000)
            t = i / rate
            wobble = 1 + 0.12 * math.sin(2 * math.pi * 0.4 * t)
            sample = math.sin(2 * math.pi * freq * wobble * t)
            sample += 0.28 * math.sin(2 * math.pi * freq * 2 * t)
            frames += struct.pack("<h", int(8200 * env * sample))
        wav.writeframes(bytes(frames))
