# Environment configuration

Create a file called **`.env`** and paste the block below, filling in what you need.
Anything left blank falls back to console logging, so the app still runs with no
third-party account at all.

**Either location works** — the backend checks both on startup:

- `<repo>/.env` — next to `start.sh`  ← recommended
- `<repo>/backend/.env`

`.env` is already in `.gitignore` — **never commit it.**

> Two notes on why you have to create this by hand: the environment this was built in
> blocks writing to any `.env*` path (it protects credential files), so I can neither
> create nor read it. And **the API reads it once at startup** — after creating or editing
> `.env` you must restart the backend.

### Quick check: is it being picked up?

```bash
cd backend && ../.venv/bin/python check_notifications.py
```

That prints which `.env` file was loaded (or every path it searched and failed to find),
and whether each provider counts as configured. You can also hit
`GET /api/admin/notifications` while signed in — same information, no secrets in it.

```bash
PUBLIC_BASE_URL=http://localhost:5173
SUPPORT_EMAIL=support@yourdomain.com

# ────────────────────────────────────────────────────────────── DATABASE ───
# Leave DATABASE_URL unset and the app uses the local SQLite file
# (backend/nexus.db). Set it and the app uses Postgres instead — nothing else
# changes. Paste Supabase's string verbatim; the driver and sslmode are added
# for you.
DATABASE_URL=postgresql://postgres:YOUR_REAL_PASSWORD@db.evvuyxuuugixqejegcex.supabase.co:5432/postgres

# If your password contains @ / # ? or other URL-structural characters, use
# these two instead of DATABASE_URL and the encoding is handled for you:
# SUPABASE_PROJECT_REF=evvuyxuuugixqejegcex
# SUPABASE_DB_PASSWORD=the-password-with-@-and-/-in-it

# ─────────────────────────────────────────────────────────────── EMAIL ────
# MAIL_PROVIDER: smtp | resend | console
MAIL_PROVIDER=smtp
MAIL_FROM_NAME=ToppersDeck
MAIL_FROM=youraddress@gmail.com
MAIL_REPLY_TO=

# Gmail — see "Sending from Gmail" below
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USER=youraddress@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx

# Resend (recommended once you own a domain)
# MAIL_PROVIDER=resend
RESEND_API_KEY=

# ───────────────────────────────────────────────────────────────── SMS ────
# SMS_PROVIDER: msg91 | twilio | fast2sms | console
SMS_PROVIDER=console
SMS_DEFAULT_COUNTRY=91

# MSG91 (India — needs DLT-registered sender ID + template)
MSG91_AUTH_KEY=
MSG91_SENDER_ID=NEXUSP
MSG91_OTP_TEMPLATE_ID=
MSG91_DLT_TE_ID=

# Twilio (worldwide; Indian numbers still need DLT registration)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=+1xxxxxxxxxx

# Fast2SMS (India, simplest to start)
FAST2SMS_API_KEY=

# ───────────────────────────────────────────────────── VIDEO / CALENDAR ───
# How a room link is produced when the mentor doesn't paste their own:
#   jitsi → a real, instantly usable room, no API key needed
#   none  → require the mentor to paste a Google Meet / Zoom link
# A mentor-supplied Meet link always takes priority either way.
MEET_PROVIDER=jitsi
JITSI_BASE=https://meet.jit.si

REMINDER_MINUTES=60
NOTIFY_ENABLED=true
SEND_SESSION_INVITES=true
```

---

## Connecting to Supabase

1. **Get the password.** Supabase dashboard → Project Settings → Database →
   *Reset database password*. The connection string on the dashboard shows
   `[YOUR-PASSWORD]` as a placeholder — it is not your real password, and the app
   refuses to start if you paste it unchanged.
2. **Put the URL in `.env`** as shown above, then restart the backend.
3. **Check it** before touching the UI:

```bash
cd backend && ../.venv/bin/python check_db.py --tables
```

That prints which backend you are on, the host (password masked), the server version,
and every table with its row count. It exits non-zero if the connection fails, so it
can gate a deploy.

### Which of the three connection strings to use

Supabase offers three, and the difference matters:

| Where to find it | Host / port | Use it when |
|---|---|---|
| **Direct** | `db.<ref>.supabase.co:5432` | Local development on an IPv6-capable network. **This host resolves to IPv6 only** — on an IPv4-only machine or host it simply will not connect. |
| **Session pooler** | `aws-0-<region>.pooler.supabase.com:5432` | Anywhere without IPv6. Behaves like a normal Postgres connection. **Use this for deployment.** |
| **Transaction pooler** | `aws-0-<region>.pooler.supabase.com:6543` | Serverless/lambda with many short-lived connections. The app detects port 6543 and disables prepared statements automatically, because a transaction pooler hands a different backend to every transaction. |

The app handles all three; you only have to pick the right one for where it runs.

### What happened to the schema that was already there

The project already contained a different 29-table schema for this same product
(UUID keys, `bookings`, `escrow_ledger`, `evaluations`, `mentor_kyc`, …). It was
completely empty — 0 rows in every table — and incompatible with this app's models,
which use integer keys and expect columns that schema did not have.

It was dumped to **[`schema-backup.sql`](schema-backup.sql)** (29 tables, 23 enum types,
22 indexes, 62 foreign keys) and then dropped so the app could own the `public` schema.
To bring it back, run that file in the Supabase SQL editor — but note the app cannot
use both at once, since six table names collide.

Supabase's own `auth`, `storage`, `realtime`, `extensions` and `vault` schemas were
never touched.

### Latency: keep the API and the database in the same region

Every query costs a network round trip. From a laptop in India to this project the
round trip is ~130 ms, so an endpoint issuing 40 queries takes 5 seconds — the same
code takes 4 ms on local SQLite.

Two things follow:

1. **N+1 queries stop being free.** Discovery was issuing 71 queries for 14 mentors
   (one per mentor for user, services, slots, blackouts and bookings). It now uses
   `selectinload` plus a single batched booking lookup: 6 queries regardless of how
   many mentors are listed. The order lists prime their users the same way, via
   `prime_orders()` in [`serializers.py`](backend/app/serializers.py).
2. **Deploy the API in the same region as the database.** Co-located, a round trip is
   under a millisecond and these endpoints return in tens of milliseconds. Running the
   API on your laptop against a remote database will always feel slow, and that is the
   network, not the code.

### Notes

- **The project URL and publishable key are not used.** Those are for Supabase's REST/JS
  client. This backend talks to Postgres directly over SQLAlchemy, so the database URL is
  the only credential it needs. The publishable key is safe to expose by design — it is
  only useful if you later add Supabase Auth or Storage from the frontend.
- **Uploaded files still live on local disk** (`backend/storage/`). Moving them to Supabase
  Storage is a separate change; the database switch does not touch them.
- **The schema is created automatically** on first boot, and the 14 mentors + 3 aspirants
  are seeded only if the `users` table is empty — so pointing at a populated database is
  safe and will not duplicate anything.
- **`./reset-data.sh` now works against Postgres too.** On Postgres it drops every
  application table and asks you to type `drop` first, because unlike deleting a local file
  there is no undo.

---

## Sending from Gmail

1. Google Account → **Security** → turn on **2-Step Verification**. This is required;
   App Passwords don't exist without it.
2. Security → **App passwords** → choose *Mail* → copy the **16-character code**.
3. Put your Gmail address in `SMTP_USER` and that 16-character code in `SMTP_PASSWORD`
   (spaces are fine — they're stripped). **Your normal Gmail password will not work.**

Then verify it before touching the UI:

```bash
cd backend
../.venv/bin/python check_notifications.py --email you@gmail.com --invite
```

`--invite` attaches a real calendar invite so you can confirm Gmail renders the
"Add to calendar" card.

**Gmail limits:** roughly 500 messages/day, and mail from `@gmail.com` will often land in
spam for other recipients because you can't set SPF/DKIM on Google's domain. Fine for a
pilot. Before launch, move to a transactional provider (Resend, SES, Postmark) sending from
**your own domain** with SPF, DKIM and DMARC configured.

## Sending SMS in India

Indian SMS is gated by **DLT registration** (TRAI rules) regardless of provider — you
register your business, your sender ID, and each message template. Budget 3–7 working days.

- **Fast2SMS** — lowest friction to start; has a ready OTP route.
- **MSG91** — best OTP tooling; set `MSG91_OTP_TEMPLATE_ID` to use their dedicated OTP
  endpoint, which handles retries and verification server-side.
- **Twilio** — easiest internationally, still needs DLT for Indian destinations.

Until DLT clears, leave `SMS_PROVIDER=console`: email OTP works immediately and is enough
to run a pilot.

## What gets sent, and when

| Trigger | Email | SMS | Calendar |
|---|---|---|---|
| OTP requested (email) | ✅ code | — | — |
| OTP requested (mobile) | — | ✅ code | — |
| Aspirant requests a session | ✅ to mentor | — | — |
| Mentor confirms | ✅ both sides | ✅ both sides | ✅ `METHOD:REQUEST` |
| ~60 min before start | ✅ both sides | ✅ both sides | — |
| Session cancelled | ✅ both sides | — | ✅ `METHOD:CANCEL` (withdraws the event) |
| Copy submitted for evaluation | ✅ to mentor, with SLA deadline | — | — |
| Evaluated copy returned | ✅ to aspirant | ✅ to aspirant | — |

Reminders are driven by the background sweeper (every 15 min) and stamped on
`orders.reminder_sent_at`, so they can't fire twice.

## Security note

Once `MAIL_PROVIDER` or `SMS_PROVIDER` is configured with working credentials, the
`/api/auth/otp/request` endpoint **stops returning the code in its response**. It only
returns `demo_code` when no provider is set up — i.e. on a local install. If a configured
provider rejects the send, the endpoint returns `502` rather than falling back to leaking
the code.
