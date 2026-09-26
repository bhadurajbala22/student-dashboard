# ToppersDeck

**A verified mentorship, evaluation and strategy marketplace for Civil Services aspirants.**

Aspirants get one-to-one access to premium faculty, recent rankers and veteran aspirants.
Mentors operate as independent providers — they set their own prices and hours. The platform
supplies the infrastructure: scheduling, video, chat, an internal recording vault, and
escrow-backed payments that only reach the mentor after the work is delivered.

---

## Running it

The app needs a Postgres database (Supabase). Copy `.env.example` to `.env`, set
`DATABASE_URL` and `JWT_SECRET`, then:

```bash
./start.sh
```

Then open **http://localhost:5173**.

| Service | URL | What it is |
|---|---|---|
| Marketplace | http://localhost:5173 | Vite dev server (proxies `/api` → 8000) |
| API | http://127.0.0.1:8000 | FastAPI + Postgres (Supabase) |
| API docs | http://127.0.0.1:8000/docs | Interactive OpenAPI explorer |

Ctrl-C stops both. `./reset-data.sh` wipes the database so the demo data re-seeds fresh.

### Demo logins — password is `demo1234` for every account

**Aspirants**

| Email | What you'll see |
|---|---|
| `riya@student.in` | Answer-writing phase. A live retainer with credits part-used, a checked copy awaiting approval, a session starting in minutes, an anonymous booking, unread chat. |
| `karan@student.in` | First attempt, works full time. An **open dispute** (mentor no-show) and an **SLA auto-refund** to inspect. |
| `aisha@student.in` | Just starting. A fresh copy submission and a pending request. |

**Mentors**

| Email | Category | What you'll see |
|---|---|---|
| `ananya@nexus.in` | Premium Faculty | All four services on, 2 pending requests, escrow ledger, ₹5.4k held |
| `aarav@nexus.in` | Recent Ranker (AIR 42) | Pre-LBSNAA window, 24-hour SLA copy checking |
| `nandini@nexus.in` | Recent Ranker (AIR 118) | Mental-health mentoring, an **anonymous** booking where the aspirant is masked |
| `sneha@nexus.in` | Veteran Aspirant | High-volume copy queue, retainer subscriber, 24-hour SLA |

14 mentors and 3 aspirants ship pre-registered, with orders spread across every lifecycle
state. Or register fresh from the landing page — both onboarding flows are complete.

---

## What's implemented

### The three-sided supply model
Mentors self-classify as **Premium Faculty**, **Recent Ranker** (selected candidates in their
3–4 month pre-LBSNAA window) or **Veteran Aspirant** (Interview/Mains cleared). Category drives
discovery filters and the pricing reference band.

### Four services, each priced by the mentor
| Service | Unit | Mechanics |
|---|---|---|
| 1-on-1 video session | per 30 min | Booked against real calendar availability; multi-slot bookings need consecutive free slots; **Anonymous Mode** available |
| Offline copy evaluation | per answer | PDF upload, a 24/48/72-hour **SLA**, and a daily workload cap per mentor. The mentor marks **on the copy itself** — see the review room below |
| Live copy evaluation | per 45 min | Upload the copy at booking; the copy is open in the review room during the call and the aspirant watches the marks appear live |
| Monthly retainer | per month | Session + evaluation credits, redeemable against normal slots |

### Escrow, end to end
Money is captured into platform escrow at booking. It reaches the mentor only after delivery
plus a 72-hour review window. Implemented in [`backend/app/escrow.py`](backend/app/escrow.py):

- **Capture** → commission split recorded, `escrow_state = held`, ledger entry written
- **Deliver** → 72-hour countdown starts
- **Approve** → releases immediately; **auto-release** if the window lapses quietly
- **Dispute** → freezes the funds instantly, pending adjudication
- **SLA breach** → offline evaluation is refunded automatically (or the credit is returned)
- **Credit expiry** → unused retainer credits are *liquidated*: the platform keeps its
  commission on the unused portion, the rest clears to the mentor, no dead liability

A background sweeper runs every 15 minutes and on boot. "Run retention sweep" on the vault page
triggers it on demand so you can watch it work.

### Trust & safety moats
- **Internal video vault** — sessions stream for 7 days, then archive, then purge on day 30.
  Downloads are blocked for *both* parties: the stream endpoint serves `Content-Disposition:
  inline` with `no-store`, and there is no download route. Protects mentor IP while keeping
  dispute evidence.
- **Anonymous Mode** — the aspirant's name, photo and benchmarking profile are hidden from the
  mentor for that order. Masking lives in the serializer
  ([`serializers.py`](backend/app/serializers.py)) so no route can leak it; the mentor sees
  `Aspirant #7C3A` everywhere, including the vault and their earnings ledger.
- **Automated dispute resolution** — a strict 72-hour window; raising a valid issue freezes
  escrow without waiting for an admin.

### Onboarding
Mentors go through the full 8-screen flow: account + OTP → KYC (Aadhaar/PAN/bank with document
upload) → UPSC credentials (with *mandatory* marksheet upload if Mains is claimed) → storefront
pricing → subject expertise → drag-to-paint weekly calendar + workload cap → agreements →
pending-verification dashboard. Progress is saved per screen and a progress rail tracks it.

Aspirants complete a **Benchmarking Profile** (target year, attempts, optional, preparation
stage, biggest hurdle) that every mentor sees before accepting — the mechanism that stops four
mentors giving four contradictory plans.

### Notifications — email, SMS and calendar invites
Configured entirely through the environment ([ENVIRONMENT.md](ENVIRONMENT.md)); with nothing
set the channels log to the console so a fresh checkout still runs.

- **Email** — SMTP (works with a Gmail App Password) or the Resend API. Templates are
  table-based and inline-styled to survive Gmail/Outlook, in the app's red-and-white palette.
- **SMS** — MSG91 (incl. their dedicated OTP endpoint), Twilio or Fast2SMS, with Indian
  number normalisation.
- **Calendar invites** — confirming a session emails both sides an RFC 5545 invite with
  `METHOD:REQUEST`, so Gmail renders an RSVP card and the event lands in Google Calendar with
  a 30-minute alarm. Cancelling sends `METHOD:CANCEL` against the same UID, which withdraws
  the event. IST wall-clock is converted to UTC so the event shows at the right hour.
- **Reminders** — the background sweeper emails and texts both sides ~60 minutes before a
  session, stamped on `orders.reminder_sent_at` so it can't double-fire.
- Sends run on a background thread pool: a slow SMTP handshake never blocks an API request,
  and a failed send never fails a booking.
- Verify your credentials before touching the UI:
  `cd backend && ../.venv/bin/python check_notifications.py --email you@gmail.com --invite`

### Marking on the copy — the review room
`/app/review/:orderId` ([`frontend/src/pages/ReviewRoom.jsx`](frontend/src/pages/ReviewRoom.jsx))
renders the aspirant's PDF with pdf.js and puts a transparent ink canvas over it
([`CopyAnnotator.jsx`](frontend/src/components/CopyAnnotator.jsx)). It is the same screen for
both evaluation types — only who is watching differs.

- **Tools** — pen, highlighter, strike-through, margin note and eraser, in four colours.
  Notes get a leader line back to the point they refer to.
- **Marks are stored as data, not burned into a new PDF.** Coordinates are normalised `0..1`
  against the page box, so a mark drawn on a phone lands in the same place on a desktop, stays
  re-editable, and renders crisply at any zoom. They live on `orders.annotations`.
- **Offline evaluation** — the mentor marks whenever they like; every stroke and both text
  fields autosave on an 800 ms debounce, so navigating away cannot lose work. "Return to
  aspirant" closes the SLA and emails them. No second PDF is uploaded — the aspirant opens the
  same copy read-only, with the marks on it.
- **Live evaluation** — the aspirant has the same screen open next to the call and polls every
  2.5 s, so marks appear as the mentor draws them. The mentor's copy is editable; the
  aspirant's is strictly read-only.
- pdf.js cannot attach an `Authorization` header to its own fetch, and a token in the query
  string would leak into history and server logs, so the bytes are fetched via
  `fetchBytes()` in [`api.js`](frontend/src/api.js) and handed to pdf.js as a buffer.
- The route is `React.lazy`-loaded: pdf.js is ~140 KB gzipped and only matters once a copy is
  actually open, which keeps the landing page and discovery light on a phone connection.

### Calling from chat
The chat header resolves the peer's confirmed video and live-evaluation bookings. Within the
join window it turns into a green **Join call**; outside it, the button explains that calls are
anchored to a paid booking and links to the mentor's storefront. Calls deliberately cannot be
started ad hoc — an off-books call would sit outside escrow, the recording vault and the
dispute window, which is where every guarantee on this platform lives.

### Other notable pieces
- **Drag-to-select calendar** — click and drag across a Mon–Sun × hour grid; contiguous runs
  become recurring windows, expanded server-side into bookable 30-minute slots with blackout
  dates and existing bookings removed
- **Rate guidance** — a transparent band computed from verified credentials (rank, interview
  calls, Mains years, qualification, teaching years, selections), with every line of the
  arithmetic shown. The mentor always sets the final number.
- Escrow ledger with per-service payout breakdown; ratings that feed the public profile;
  persistent chat with attachments and read receipts; in-app notifications

---

## Stack

- **Backend** — FastAPI, SQLAlchemy 2, JWT (PyJWT), PBKDF2-SHA256 passwords, async
  escrow/SLA/retention sweeper. Tables are created on boot; no migrations needed.
- **Database** — Postgres only, hosted on Supabase. Set `DATABASE_URL` in `.env`; the app
  refuses to start without it. The engine options live in [`db.py`](backend/app/db.py).
  `cd backend && ../.venv/bin/python check_db.py --tables` verifies the connection.
  See [ENVIRONMENT.md](ENVIRONMENT.md#connecting-to-supabase).
- **Frontend** — React 19, React Router 7, Vite 7, Tailwind CSS 4. Zero UI or icon
  dependencies — the component library (`src/components/ui.jsx`), icon set (`icons.jsx`) and
  calendar planner (`WeekPlanner.jsx`) are all hand-rolled.
- **Responsive and app-ready.** Verified at 320 / 360 / 390 / 414 / 768 / 834 / 1024 / 1280 /
  1440 / 1920 px across all 19 routes — **190 viewport checks, zero horizontal overflow**.
  Below `lg` the sidebar is replaced by a **native-style bottom tab bar** (four primary
  destinations plus More, with unread badges) so a WebView wrapper feels like an app. Headings
  use `clamp()` fluid type so no in-between resolution looks wrong. Every interactive control
  is **≥44px on touch pointers** (Apple HIG / WCAG 2.5.8) via a real `min-height`, not a
  pseudo-element — the first attempt used `::after` and a click test proved browsers don't
  route taps to it. Safe-area insets for the iPhone notch and home indicator, `font-size:16px`
  on touch inputs so iOS never zooms on focus, and `prefers-reduced-motion` respected.
  A web-app manifest with maskable icons makes it installable to a home screen.
- **Browsing is open; signup happens at the point of booking.** `/mentors` and
  `/mentors/:id` are fully public — credentials, prices, availability, reviews and the
  weekly calendar are all readable with no account, inside a lightweight public shell.
  Tapping a service as a visitor opens a gate that names the exact mentor and service,
  carries that destination through `?next=`, and drops them back on the same profile once
  they register. A signed-in student hitting a public link is redirected to the in-app
  version, so shared links keep working. The API was already public for discovery — only
  order data is gated.
- **Layout — modelled on Topmate.io.** The mentor storefront is a single narrow centred
  column (max 680px): cover band, overlapping circular avatar, name, category line, badges,
  a stats row (rating · bookings · response time), then **bookable services as stacked
  full-width rows** — icon, title, mode label, duration on the left; price and unit on the
  right. Tapping a row opens a two-step booking sheet (details → escrow checkout) rather
  than a sticky side panel, which is what makes it work on a phone. Everything below folds
  into collapsible panels. The landing page follows the same grammar: a centred
  single-column hero with one primary CTA, social-proof numbers, and horizontal snap-scroll
  rails for mentors and service types.
- **Palette — red and white only.** One hue carries the whole interface. Because there is no
  second colour to lean on, state is expressed through *intensity and fill* rather than hue,
  with icons doing the semantic work. Four token ramps in
  [`src/index.css`](frontend/src/index.css):

  | Ramp | Colour | Used for |
  |---|---|---|
  | `nex-*` | vivid red | brand, primary action, danger, urgency |
  | `gold-*` | muted maroon | attention, pending, warning, weekend slots |
  | `mint-*` | charcoal | settled, complete, paid out |
  | `ink-*` | warm greys | structure, text, surfaces |

  Avatar gradients fold their stored hue into a narrow crimson→scarlet band, so identities stay
  distinguishable without leaving the palette.
- **Time** — every timestamp is naive IST wall-clock, in the database and the UI, so behaviour
  does not drift with the host timezone ([`timeutil.py`](backend/app/timeutil.py)).

```
backend/app/
  main.py        app + SPA fallback        models.py      ORM
  escrow.py      capture/release/refund/liquidate + sweeper
  pricing.py     rate-guidance engine      catalog.py     UPSC taxonomy
  serializers.py anonymous-mode masking    seed.py        14 mentors + demo activity
  sample_files.py stdlib PDF + WAV generators (no ffmpeg/reportlab here)
  routers/       auth mentors orders vault chat misc
frontend/src/
  pages/         Landing Login Join JoinAspirant JoinMentor Onboarding
                 Workspace Discover Storefront Orders Vault Chat AspirantProfile
                 MentorHome Requests Queue Calendar MyStorefront Earnings
  components/    AppShell ui icons domain WeekPlanner Otp Brand
```

---

## Setup from scratch

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd frontend && npm install
cd .. && cp .env.example .env     # then set DATABASE_URL and JWT_SECRET
```

Single-port production build (the API serves the built SPA):

```bash
cd frontend && npm run build
cd ../backend && ../.venv/bin/python -m uvicorn app.main:app --port 8000
```

## Before this goes anywhere real

- **No payment gateway.** Checkout captures an order into escrow without charging. Wire up a
  PSP (Razorpay/Stripe) plus a real escrow or nodal account, and settlement payouts.
- **Video rooms are real but unrecorded.** A mentor's own Google Meet/Zoom link is used when
  they paste one; otherwise a working Jitsi room is minted. Server-side recording into the
  vault still needs a provider SDK (100ms/Agora/Zoom) — uploads are manual today.
- **OTP and email are live** when you configure a provider — see
  [ENVIRONMENT.md](ENVIRONMENT.md). With nothing configured they fall back to console logging
  and the OTP is returned in the API response for local use; that only happens while no
  provider is set.
- **KYC is stored but not validated.** Only masked identifiers are persisted (never the full
  Aadhaar or account number) and documents land in a local folder. A real build needs an
  Aadhaar/PAN verification API, encrypted object storage with signed URLs, and a proper admin
  review queue — the `simulate-review` endpoint is an explicit demo shortcut.
- Every credential lives in `.env` (never committed). `DATABASE_URL` and `JWT_SECRET` are
  required; the app refuses to start without them.
- Uploaded files (photos, PDFs, KYC documents) are stored on local disk in `backend/storage/`,
  so they do not survive a redeploy on a container host. Move them to object storage.
