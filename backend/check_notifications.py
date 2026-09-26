#!/usr/bin/env python
"""Verify your email/SMS credentials without clicking through the UI.

    ../.venv/bin/python check_notifications.py --email you@gmail.com
    ../.venv/bin/python check_notifications.py --sms +919876543210
    ../.venv/bin/python check_notifications.py --email you@gmail.com --invite

Exits non-zero if a configured provider rejects the send, so it can gate a deploy.
"""
import argparse
import logging
import sys
from datetime import datetime, timedelta

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))

from app.notify import settings as S                      # noqa: E402
from app.notify import templates as T                     # noqa: E402
from app.notify.channels import DeliveryError, send_email, send_sms   # noqa: E402
from app.notify.ics import build_invite, google_calendar_link         # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)-7s %(message)s")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--email", help="send a test email to this address")
    ap.add_argument("--sms", help="send a test SMS to this number")
    ap.add_argument("--invite", action="store_true",
                    help="attach a calendar invite to the test email")
    args = ap.parse_args()

    st = S.status()
    print("\nConfiguration")
    print("─" * 60)
    if st["env_files_loaded"]:
        for f in st["env_files_loaded"]:
            print(f"  .env loaded          {f}")
    else:
        print("  .env loaded          NONE — searched:")
        for f in st["env_files_searched"]:
            print(f"                       {f}")
        print("\n  → Create one of those files (see ENVIRONMENT.md), then re-run.")
    print("─" * 60)
    for k, v in st.items():
        if k.startswith("env_files"):
            continue
        print(f"  {k:<20} {v}")
    print()

    if not args.email and not args.sms:
        print("Nothing to send. Pass --email and/or --sms.\n")
        return 0

    failures = 0

    if args.email:
        if not S.email_configured():
            print(f"!  MAIL_PROVIDER is '{S.MAIL_PROVIDER}' with no credentials — "
                  "the message will only be logged, not delivered.\n")
        ics = None
        if args.invite:
            start = datetime.now().replace(second=0, microsecond=0) + timedelta(days=1)
            ics = build_invite(
                uid_seed=f"nexus-test-{start:%Y%m%d%H%M}",
                summary="ToppersDeck · test session",
                description="Test invite from check_notifications.py",
                start=start, end=start + timedelta(minutes=30),
                organiser_name=S.MAIL_FROM_NAME, organiser_email=S.MAIL_FROM,
                attendees=[("Test recipient", args.email)],
                location="https://meet.jit.si/upsc-nexus-test",
                url="https://meet.jit.si/upsc-nexus-test")
        subject, html, text = T.otp_email("123456", 10, purpose="confirm this test worked")
        try:
            res = send_email(args.email, "[test] " + subject, html, text, ics)
            print(f"✓  email → {args.email} via {res['provider']} {res.get('id','')}")
        except DeliveryError as e:
            print(f"✗  email failed: {e}")
            failures += 1

    if args.sms:
        if not S.sms_configured():
            print(f"!  SMS_PROVIDER is '{S.SMS_PROVIDER}' with no credentials — "
                  "the message will only be logged, not delivered.\n")
        try:
            res = send_sms(args.sms, T.otp_sms("123456", 10), otp="123456")
            print(f"✓  sms   → {args.sms} via {res['provider']}")
        except DeliveryError as e:
            print(f"✗  sms failed: {e}")
            failures += 1

    print()
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
