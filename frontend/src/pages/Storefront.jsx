import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { CATEGORY_META, EscrowNote, SERVICE_ICON, VaultNote } from '../components/domain'
import { GuestGate } from '../components/PublicShell'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, BadgeRow, Button, Card, Field, Loading, Modal, SectionHead,
  Segmented, Select, Stars, Stepper, Textarea, Toggle, toast,
} from '../components/ui'
import { clock, firstName, inr, relative, shortStamp } from '../format'
import { useCatalog } from '../meta'

const PAY_METHODS = [
  { key: 'upi', label: 'UPI', hint: 'GPay · PhonePe', icon: Icon.Phone },
  { key: 'card', label: 'Card', hint: 'Credit / debit', icon: Icon.Wallet },
  { key: 'netbanking', label: 'Netbanking', hint: 'All banks', icon: Icon.Bank },
]

/* tab groups over the service list, the way Topmate groups a storefront */
const SERVICE_GROUP = {
  video_1on1: 'Calls', live_eval: 'Calls',
  offline_eval: 'Copy checking', retainer: 'Packages',
}

/* platform FAQs — answers the questions that stop a first booking */
const FAQS = [
  ['How does payment work?',
   'You pay when you book and the money is held in platform escrow — not sent to the mentor. '
   + 'It is released only after the session is delivered and your 72-hour review window closes. '
   + 'Approve early to release it sooner, or raise an issue to freeze it.'],
  ['What if the mentor does not show up?',
   'Raise an issue from your bookings page within 72 hours. The escrow freezes immediately and '
   + 'our team reviews the session recording before deciding. You are not chasing anyone for a refund.'],
  ['What happens to my answer copy?',
   'Offline evaluations carry a guaranteed turnaround of 24, 48 or 72 hours depending on the '
   + 'mentor. If they miss it you are refunded automatically — no ticket needed. Your PDF is only '
   + 'visible to that one mentor.'],
  ['Are sessions recorded, and who can see them?',
   'Live sessions are recorded to an internal vault for quality and dispute evidence. You can '
   + 'stream yours for 7 days; neither you nor the mentor can download it. It is archived after '
   + 'that and purged on day 30.'],
  ['Can I book without the mentor knowing who I am?',
   'Yes. Turn on Anonymous Mode when booking a 1-on-1 call and your name, photo and benchmarking '
   + 'profile stay hidden — useful for burnout, a repeat attempt, or anything you would rather '
   + 'discuss without a name attached.'],
  ['How are mentors verified?',
   'Every mentor submits government ID, PAN and bank proof, plus the UPSC marksheet or interview '
   + 'admit card behind any claim on their profile. Our team checks each one by hand before the '
   + 'profile goes live.'],
]

/* the label under each service title, Topmate-style */
const SERVICE_MODE = {
  video_1on1: 'Video meeting',
  offline_eval: 'Async · PDF upload',
  live_eval: 'Video + whiteboard',
  retainer: 'Monthly package',
}

/* ───────────────────────────────────────────────────────── slot picker */
function SlotPicker({ days, value, onPick, spanUnits = 1 }) {
  const [dayIdx, setDayIdx] = useState(0)
  useEffect(() => { setDayIdx(0) }, [days?.length])
  if (!days?.length) {
    return (
      <Alert tone="ink" icon={<Icon.Calendar size={15} />}>
        This mentor hasn't published live-call availability. Message them and they can open a
        window, or use their asynchronous copy evaluation.
      </Alert>
    )
  }
  const day = days[dayIdx]
  const usable = day.slots.map((s, i) => {
    if (s.booked) return { ...s, ok: false }
    for (let k = 1; k < spanUnits; k++) {
      const nxt = day.slots[i + k]
      if (!nxt || nxt.booked || nxt.start_at !== day.slots[i + k - 1].end_at) {
        return { ...s, ok: false }
      }
    }
    return { ...s, ok: true }
  })

  return (
    <div>
      <div className="no-bar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((d, i) => (
          <button key={d.date} onClick={() => setDayIdx(i)}
            className={`focusable tap shrink-0 rounded-2xl px-3.5 py-2.5 text-center transition ${i === dayIdx
              ? 'bg-nex-600 text-white'
              : 'bg-ink-50 text-ink-700 hover:bg-ink-100'}`}>
            <span className="block text-[10px] font-extrabold uppercase tracking-wide opacity-70">
              {d.day_name.slice(0, 3)}
            </span>
            <span className="block text-[14px] font-extrabold">{d.pretty}</span>
            <span className={`mt-0.5 block text-[9.5px] font-extrabold ${i === dayIdx ? 'text-white/70' : 'text-mint-600'}`}>
              {d.open_count} open
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {usable.map(s => {
          const active = value === s.start_at
          return (
            <button key={s.start_at} disabled={!s.ok} onClick={() => onPick(s.start_at)}
              className={`focusable tap rounded-xl px-2 py-2.5 text-[12.5px] font-bold transition ring-1 ring-inset ${active
                ? 'bg-nex-600 text-white ring-nex-600'
                : !s.ok
                  ? 'cursor-not-allowed bg-ink-50 text-ink-300 ring-ink-100 line-through'
                  : 'bg-white text-ink-800 ring-ink-200 hover:bg-nex-50 hover:ring-nex-300'}`}>
              {s.label}
            </button>
          )
        })}
      </div>
      <p className="mt-2.5 text-[11.5px] text-ink-500">
        {day.day_name}, {day.pretty} · {day.open_count} of {day.slots.length} free
        {spanUnits > 1 && ` · needs ${spanUnits} back-to-back slots`}
      </p>
    </div>
  )
}

function PdfPick({ file, onPick, label, hint }) {
  const ref = useRef(null)
  return (
    <Field label={label} hint={hint}>
      <button type="button" onClick={() => ref.current?.click()}
        className={`focusable flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-3.5 text-left transition ${file ? 'border-mint-300 bg-mint-50' : 'border-ink-300 hover:border-nex-400 hover:bg-nex-50/40'}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${file ? 'bg-mint-100 text-mint-600' : 'bg-ink-100 text-ink-500'}`}>
          {file ? <Icon.Pdf size={18} /> : <Icon.Upload size={18} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-bold text-ink-800">
            {file ? file.name : 'Choose your answer PDF'}
          </span>
          <span className="block text-[11px] text-ink-500">
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF only · max 10 MB'}
          </span>
        </span>
      </button>
      <input ref={ref} type="file" accept="application/pdf" className="hidden"
        onChange={e => onPick(e.target.files?.[0] || null)} />
    </Field>
  )
}

/* ─────────────────────────────────── a stacked, tappable service row */
function ServiceRow({ svc, onPick, disabled, note }) {
  const I = SERVICE_ICON[svc.kind] || Icon.File
  const meta = {
    video_1on1: `${svc.unit_minutes} mins`,
    live_eval: `${svc.unit_minutes} mins`,
    offline_eval: `${svc.sla_hours}h turnaround`,
    retainer: `${svc.validity_days} days`,
  }[svc.kind]

  return (
    <button onClick={() => !disabled && onPick(svc.kind)} disabled={disabled}
      className={`focusable group flex w-full items-center gap-4 border-b border-ink-200 px-5 py-4 text-left transition last:border-0 ${disabled ? 'cursor-not-allowed opacity-55' : 'hover:bg-nex-50/60'}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-nex-50 text-nex-600 transition group-hover:bg-nex-600 group-hover:text-white">
        <I size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-2 text-[14.5px] font-extrabold leading-snug text-ink-900">
          {svc.kind === 'retainer' && svc.package_title ? svc.package_title : svc.label}
        </span>
        <span className="mt-0.5 block text-[12px] font-semibold text-ink-500">
          {SERVICE_MODE[svc.kind]}{meta ? ` · ${meta}` : ''}
        </span>
        {note && <span className="mt-1 block text-[11.5px] font-bold text-mint-600">{note}</span>}
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[15px] font-extrabold text-ink-900 tnum">{inr(svc.price)}</span>
        <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-400">
          {svc.unit}
        </span>
      </span>
      <Icon.Chevron size={17} className="shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-nex-600" />
    </button>
  )
}

/* a collapsible block, so the long column stays scannable */
function Panel({ title, icon, children, defaultOpen = false, hint }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="surface overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="focusable flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-ink-25">
        {icon}
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold text-ink-900">{title}</span>
          {hint && <span className="mt-0.5 block text-[11.5px] text-ink-500">{hint}</span>}
        </span>
        <Icon.ChevronDown size={17}
          className={`shrink-0 text-ink-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="border-t border-ink-200 px-5 py-5">{children}</div>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ page */
export default function Storefront() {
  const { id } = useParams()
  const nav = useNavigate()
  const cat = useCatalog()
  const { user } = useAuth()
  const isGuest = !user
  const [gate, setGate] = useState(null)      // { serviceLabel } for a signed-out visitor
  const [group, setGroup] = useState('All')
  const [faqOpen, setFaqOpen] = useState(null)
  const reviewRail = useRef(null)

  const [m, setM] = useState(null)
  const [slots, setSlots] = useState(null)
  const [retainer, setRetainer] = useState(null)

  const [booking, setBooking] = useState(null)      // service kind being booked
  const [step, setStep] = useState('form')          // form | pay
  const [pay, setPay] = useState('upi')
  const [busy, setBusy] = useState(false)

  const [vid, setVid] = useState({ start_at: '', slots: 1, agenda: '', subject: '', is_anonymous: false, use_credit: false })
  const [ev, setEv] = useState({ file: null, answer_count: 1, subject: '', agenda: '', use_credit: false })
  const [live, setLive] = useState({ start_at: '', file: null, subject: '', agenda: '' })

  const load = () => {
    api.get(`/mentors/${id}`).then(d => {
      setM(d)
      setVid(v => ({ ...v, subject: d.subjects?.[0] || '' }))
    }).catch(() => toast.error('Could not load that profile'))
    api.get(`/mentors/${id}/slots?days=21`).then(setSlots).catch(() => {})
    if (user) {
      api.get('/orders?kind=retainer&status=active').then(d => {
        setRetainer(d.results.find(o => String(o.mentor?.id) === String(id)) || null)
      }).catch(() => {})
    }
  }
  useEffect(load, [id, user])

  if (!m || !slots) return <Loading label="Loading profile" />

  const active = (m.services || []).filter(s => s.is_active && s.price > 0)
  const groups = ['All', ...[...new Set(active.map(s => SERVICE_GROUP[s.kind]))]]
  const shown = group === 'All' ? active : active.filter(s => SERVICE_GROUP[s.kind] === group)
  const svc = active.find(s => s.kind === booking)
  const cheapest = active.length ? Math.min(...active.map(s => s.price)) : null
  const meta = CATEGORY_META[m.category] || CATEGORY_META.veteran

  const amount = !svc ? 0
    : booking === 'video_1on1' ? (vid.use_credit ? 0 : svc.price * vid.slots)
      : booking === 'offline_eval' ? (ev.use_credit ? 0 : svc.price * ev.answer_count)
        : svc.price
  const usingCredit = (booking === 'video_1on1' && vid.use_credit)
    || (booking === 'offline_eval' && ev.use_credit)

  const openService = (kind) => {
    if (isGuest) {
      const s = active.find(x => x.kind === kind)
      return setGate({ serviceLabel: s?.kind === 'retainer' && s.package_title
        ? s.package_title : s?.label })
    }
    setBooking(kind); setStep('form')
  }

  const toCheckout = () => {
    if (booking === 'video_1on1' && !vid.start_at) return toast.error('Pick a slot first')
    if (booking === 'offline_eval' && !ev.file) return toast.error('Attach your answer PDF')
    if (booking === 'live_eval' && (!live.start_at || !live.file)) {
      return toast.error('Pick a slot and attach the copy you want reviewed')
    }
    setStep('pay')
  }

  const confirm = async () => {
    setBusy(true)
    try {
      let order
      if (booking === 'video_1on1') {
        order = await api.post('/orders/video', {
          mentor_id: m.id, start_at: vid.start_at, slots: vid.slots, agenda: vid.agenda,
          subject: vid.subject, is_anonymous: vid.is_anonymous, use_credit: vid.use_credit,
        })
      } else if (booking === 'offline_eval') {
        const fd = new FormData()
        fd.append('mentor_id', m.id); fd.append('answer_count', String(ev.answer_count))
        fd.append('subject', ev.subject); fd.append('agenda', ev.agenda)
        fd.append('use_credit', String(ev.use_credit)); fd.append('file', ev.file)
        order = await api.upload('/orders/evaluation', fd)
      } else if (booking === 'live_eval') {
        const fd = new FormData()
        fd.append('mentor_id', m.id); fd.append('start_at', live.start_at)
        fd.append('subject', live.subject); fd.append('agenda', live.agenda)
        fd.append('file', live.file)
        order = await api.upload('/orders/live', fd)
      } else {
        order = await api.post('/orders/retainer', { mentor_id: m.id })
      }
      setBooking(null)
      toast.success(usingCredit ? 'Credit redeemed — the mentor has been notified'
        : `Paid into escrow · ${order.reference}`)
      nav('/app/orders')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const message = async () => {
    if (isGuest) return setGate({ action: 'message' })
    try {
      const th = await api.post('/chat/threads', { peer_id: m.id })
      nav(`/app/chat/${th.id}`)
    } catch (e) { toast.error(e.message) }
  }

  const journey = [
    m.total_attempts ? [`${m.total_attempts} attempt${m.total_attempts > 1 ? 's' : ''} given`, Icon.Target] : null,
    m.prelims_cleared_years?.length ? [`Prelims cleared ${m.prelims_cleared_years.join(', ')}`, Icon.Check] : null,
    m.mains_cleared_years?.length ? [`Mains cleared ${m.mains_cleared_years.join(', ')}`, Icon.File] : null,
    m.interview_years?.length ? [`Interview ${m.interview_years.join(', ')}`, Icon.Users] : null,
    m.has_final_rank ? [`AIR ${m.final_rank} · ${m.service_allocated} (${m.batch_year} batch)`, Icon.Sparkle] : null,
  ].filter(Boolean)

  return (
    /* The booking bar is a sibling of the animated wrapper: an entrance transform
       would otherwise make that wrapper the containing block for `position: fixed`
       and drop the bar off the bottom of the screen. */
    <>
    <div className={`a-rise mx-auto w-full max-w-[680px] ${isGuest ? "px-4 py-8 sm:px-6" : ""} pb-28 lg:pb-0`}>
      <Link to={isGuest ? '/mentors' : '/app/discover'}
        className="tap mb-5 inline-flex items-center gap-1.5 py-1 text-[13px] font-bold text-ink-500 hover:text-ink-900">
        <Icon.Chevron size={14} className="rotate-180" /> All mentors
      </Link>

      {/* ══════════════════════════════════════════ profile header */}
      <div className="surface overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-nex-600 to-nex-800" />
        <div className="px-6 pb-6 text-center">
          <div className="-mt-12 mb-3 flex justify-center">
            <span className="rounded-full bg-white p-1.5">
              <Avatar name={m.name} initials={m.initials} hue={m.hue} photo={m.photo} size={92} />
            </span>
          </div>

          <h1 className="text-fluid-h3 font-extrabold tracking-[-0.03em] text-ink-900">{m.name}</h1>
          <p className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12.5px] font-bold text-ink-500">
            <span className="inline-flex items-center gap-1.5"><meta.icon size={13} />{meta.label}</span>
            <span className="text-ink-300">·</span>
            <span className="font-semibold">{m.city}</span>
            {m.employment_status && <>
              <span className="text-ink-300">·</span>
              <span className="font-semibold">{m.employment_status}</span>
            </>}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <BadgeRow badges={m.badges} max={5} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-ink-100 pt-4">
            {m.rating ? (
              <span className="inline-flex items-center gap-1.5">
                <Stars value={m.rating} size={13} showValue={false} />
                <span className="text-[13px] font-extrabold text-ink-900 tnum">{m.rating}</span>
                <span className="text-[12px] text-ink-400 tnum">({m.rating_count})</span>
              </span>
            ) : <span className="text-[12.5px] font-bold text-ink-400">New to ToppersDeck</span>}
            <span className="text-[12.5px] font-semibold text-ink-600 tnum">
              <span className="font-extrabold text-ink-900">{m.orders_completed}</span> bookings
            </span>
            <span className="text-[12.5px] font-bold text-mint-600">
              Replies in ~{m.response_hours}h
            </span>
          </div>

          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-600">{m.headline}</p>

          {m.languages?.length > 0 && (
            <p className="mt-2.5 text-[12px] text-ink-500">
              Teaches in {m.languages.join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════ active retainer banner */}
      {retainer && (
        <div className="mt-4 rounded-2xl border border-mint-200 bg-mint-50 px-5 py-4">
          <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-mint-700">
            <Icon.Package size={15} /> {retainer.package_title} · active
          </p>
          <p className="mt-1.5 text-[12px] text-mint-700">
            <span className="font-extrabold">{retainer.session_credits_left}</span> call credits and{' '}
            <span className="font-extrabold">{retainer.eval_credits_left}</span> evaluation credits
            left · {retainer.days_left} days remaining. Pick a service below to redeem one.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════ services */}
      <div className="mt-5">
        <p className="mb-2.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-400">
          Book a service
        </p>
        {isGuest && (
          <p className="mb-2.5 flex items-start gap-2 rounded-2xl bg-nex-50 px-4 py-3 text-[12.5px] leading-relaxed text-nex-900">
            <Icon.Info size={15} className="mt-px shrink-0 text-nex-600" />
            <span>
              Browse freely — we only ask for your details when you actually book. Pick a
              service to see what's involved.
            </span>
          </p>
        )}
        {groups.length > 2 && (
          <div className="no-bar mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
            {groups.map(g => (
              <button key={g} onClick={() => setGroup(g)}
                className={`focusable tap shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-extrabold transition ${group === g
                  ? 'bg-ink-800 text-ink-25'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
                {g}
                <span className={`ml-1.5 text-[10.5px] ${group === g ? 'text-ink-400' : 'text-ink-400'}`}>
                  {g === 'All' ? active.length : active.filter(s => SERVICE_GROUP[s.kind] === g).length}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="surface overflow-hidden !p-0">
          {active.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-ink-400">
              This mentor has no services switched on right now.
            </p>
          ) : shown.map(s => (
            <ServiceRow key={s.kind} svc={s} onPick={openService}
              disabled={s.kind === 'retainer' && !!retainer}
              note={s.kind === 'retainer' && retainer ? 'You already have this active'
                : s.kind === 'video_1on1' && retainer?.session_credits_left > 0
                  ? `${retainer.session_credits_left} credits available`
                  : s.kind === 'offline_eval' && retainer?.eval_credits_left > 0
                    ? `${retainer.eval_credits_left} credits available` : ''} />
          ))}
        </div>
      </div>

      <Button variant="outline" className="mt-4 w-full" icon={<Icon.Chat size={15} />}
        onClick={message}>
        Message {firstName(m.name)} first
      </Button>

      {/* ══════════════════════════════════════════ the long tail */}
      <div className="mt-6 space-y-3">
        <Panel defaultOpen title="Teaching philosophy"
          icon={<Icon.Info size={17} className="shrink-0 text-nex-600" />}>
          <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
            {m.philosophy || 'No description yet.'}
          </p>
        </Panel>

        {journey.length > 0 && (
          <Panel title="UPSC journey" hint="Every claim is backed by a verified document"
            icon={<Icon.Route size={17} className="shrink-0 text-nex-600" />}>
            <div className="space-y-2.5">
              {journey.map(([text, I]) => (
                <div key={text} className="flex items-start gap-2.5">
                  <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-mint-50 text-mint-600">
                    <I size={13} />
                  </span>
                  <span className="text-[13px] font-semibold text-ink-700">{text}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        <Panel title="Credentials" icon={<Icon.Cap size={17} className="shrink-0 text-nex-600" />}>
          <dl className="grid gap-3.5 sm:grid-cols-2">
            {[
              ['Highest qualification', m.highest_qualification],
              ['University', m.university],
              ['Teaching experience', m.teaching_years ? `${m.teaching_years} years` : null],
              ['Online teaching', m.online_teaching_years ? `${m.online_teaching_years} years` : null],
              ['Students mentored', m.students_mentored?.toLocaleString('en-IN')],
              ['Students in the final list', m.selections_produced],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k}>
                <dt className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">{k}</dt>
                <dd className="mt-0.5 text-[13px] font-extrabold text-ink-900">{v}</dd>
              </div>
            ))}
          </dl>
          {m.other_credentials && (
            <p className="mt-4 rounded-xl bg-ink-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-600">
              {m.other_credentials}
            </p>
          )}
        </Panel>

        <Panel title="Subject expertise" icon={<Icon.Book size={17} className="shrink-0 text-nex-600" />}>
          <div className="space-y-3.5">
            {Object.entries(m.expertise || {}).filter(([, v]) => v?.length).map(([gkey, items]) => (
              <div key={gkey}>
                <p className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                  {cat.subject_groups?.[gkey]?.label || gkey}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(s => (
                    <span key={s} className="rounded-lg bg-nex-50 px-2.5 py-1 text-[11.5px] font-bold text-nex-700">{s}</span>
                  ))}
                </div>
              </div>
            ))}
            {m.optional_subjects?.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                  Optional subjects
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {m.optional_subjects.map(s => (
                    <span key={s} className="rounded-lg bg-gold-50 px-2.5 py-1 text-[11.5px] font-bold text-gold-700">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Panel>

        {m.reviews?.length > 0 && (
          <div className="surface overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4">
              <Icon.Star size={17} filled className="shrink-0 text-gold-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold text-ink-900">
                  Testimonials · {m.rating} average
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-500">
                  {m.rating_count} ratings from aspirants
                </p>
              </div>
              <div className="hidden gap-1.5 sm:flex">
                {[-1, 1].map(d => (
                  <button key={d} aria-label={d < 0 ? 'Previous' : 'Next'}
                    onClick={() => reviewRail.current?.scrollBy({ left: d * 300, behavior: 'smooth' })}
                    className="focusable grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-500 transition hover:border-nex-300 hover:text-nex-600">
                    <Icon.Chevron size={15} className={d < 0 ? 'rotate-180' : ''} />
                  </button>
                ))}
              </div>
            </div>
            <div ref={reviewRail}
              className="no-bar flex gap-3 overflow-x-auto border-t border-ink-200 px-5 py-5"
              style={{ scrollSnapType: 'x mandatory' }}>
              {m.reviews.map(r => (
                <figure key={r.id}
                  className="flex w-[260px] shrink-0 flex-col rounded-2xl bg-ink-25 p-4"
                  style={{ scrollSnapAlign: 'start' }}>
                  <Stars value={r.rating} size={12} showValue={false} />
                  {r.comment && (
                    <blockquote className="mt-2.5 flex-1 text-[12.5px] leading-relaxed text-ink-700">
                      “{r.comment}”
                    </blockquote>
                  )}
                  <figcaption className="mt-3 border-t border-ink-200 pt-2.5">
                    <span className="block text-[12px] font-extrabold text-ink-900">{r.student}</span>
                    <span className="block text-[11px] text-ink-400">
                      {r.service} · {relative(r.created_at)}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        <Panel title="Weekly availability"
          hint={m.next_available ? `Next free ${relative(m.next_available)}` : 'No live-call windows'}
          icon={<Icon.Calendar size={17} className="shrink-0 text-nex-600" />}>
          <div className="space-y-1.5">
            {m.availability?.filter(a => a.is_active).length ? (
              m.availability.filter(a => a.is_active).map(a => (
                <div key={a.id} className="flex items-center gap-2.5 text-[12.5px]">
                  <Badge tone={a.day_type === 'weekend' ? 'gold' : 'nex'} className="w-14 justify-center">
                    {a.day_name.slice(0, 3)}
                  </Badge>
                  <span className="font-bold text-ink-800">
                    {clock(`2000-01-01T${a.start_time}:00`)} – {clock(`2000-01-01T${a.end_time}:00`)}
                  </span>
                </div>
              ))
            ) : <p className="text-[12.5px] text-ink-400">No live-call windows published.</p>}
          </div>
          {m.blackouts?.length > 0 && (
            <p className="mt-3 border-t border-ink-100 pt-3 text-[11px] text-ink-500">
              <span className="font-bold">Away:</span> {m.blackouts.map(b => b.date).join(', ')}
            </p>
          )}
        </Panel>

        <div className="surface overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4">
            <Icon.Info size={17} className="shrink-0 text-nex-600" />
            <p className="text-[14px] font-extrabold text-ink-900">Common questions</p>
          </div>
          <div className="border-t border-ink-200">
            {FAQS.map(([q, a], i) => (
              <div key={q} className="border-b border-ink-100 last:border-0">
                <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  className="focusable flex w-full items-start gap-3 px-5 py-3.5 text-left transition hover:bg-ink-25">
                  <span className="min-w-0 flex-1 text-[13px] font-bold text-ink-800">{q}</span>
                  <Icon.ChevronDown size={16}
                    className={`mt-0.5 shrink-0 text-ink-400 transition ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                {faqOpen === i && (
                  <p className="px-5 pb-4 text-[12.5px] leading-relaxed text-ink-600">{a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5"><VaultNote days={cat.vault_stream_days} /></div>

    </div>

      {/* sticky book bar — small screens only, sits above the app tab bar */}
      {active.length > 0 && (
        <div className={`fixed inset-x-0 z-30 border-t border-ink-200 bg-white/95 px-4 py-3 pb-safe backdrop-blur-xl lg:hidden ${isGuest ? 'bottom-0' : 'bottom-[3.4rem]'}`}>
          <div className="mx-auto flex max-w-[680px] items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-bold text-ink-500">
                {firstName(m.name)} · {active.length} service{active.length > 1 ? 's' : ''}
              </p>
              <p className="text-[15px] font-extrabold leading-tight text-ink-900 tnum">
                from {inr(cheapest)}
              </p>
            </div>
            <Button size="md" className="shrink-0"
              onClick={() => openService(active[0].kind)}
              icon={<Icon.Sparkle size={15} />}>
              {isGuest ? 'Book a session' : 'Book now'}
            </Button>
          </div>
        </div>
      )}

      <GuestGate open={!!gate} onClose={() => setGate(null)} mentorName={m.name}
        serviceLabel={gate?.serviceLabel} action={gate?.action}
        next={`/app/mentors/${id}`} />

      {/* ═══════════════════════════════ booking sheet (form → pay) */}
      <Modal open={!!booking} onClose={() => setBooking(null)} width="max-w-lg"
        title={step === 'form'
          ? (svc?.kind === 'retainer' && svc.package_title ? svc.package_title : svc?.label)
          : 'Review your booking'}
        subtitle={step === 'form'
          ? `${SERVICE_MODE[booking] || ''} with ${m.name}`
          : `${svc?.label} with ${m.name}`}
        footer={step === 'form' ? (
          <>
            <Button variant="ghost" onClick={() => setBooking(null)}>Cancel</Button>
            <Button onClick={toCheckout} disabled={booking === 'retainer' && !!retainer}
              icon={<Icon.Lock size={15} />}>
              {usingCredit ? 'Redeem credit' : `Continue · ${inr(amount)}`}
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep('form')}>Back</Button>
            <Button loading={busy} onClick={confirm} icon={<Icon.Lock size={15} />}>
              {usingCredit ? 'Redeem credit' : `Pay ${inr(amount)}`}
            </Button>
          </>
        )}>

        {step === 'form' && svc && (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-3 rounded-2xl bg-ink-50 px-4 py-3">
              <span className="text-[12.5px] text-ink-600">{svc.blurb}</span>
              <span className="shrink-0 text-right">
                <span className="block text-[17px] font-extrabold text-ink-900 tnum">{inr(svc.price)}</span>
                <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-400">{svc.unit}</span>
              </span>
            </div>

            {booking === 'video_1on1' && (
              <>
                {svc.session_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {svc.session_tags.map(t => (
                      <span key={t} className="rounded-lg bg-nex-50 px-2 py-1 text-[10.5px] font-bold text-nex-700">{t}</span>
                    ))}
                  </div>
                )}
                <Field label="How long?" hint="Charged in 30-minute units.">
                  <div className="flex items-center gap-3">
                    <Stepper value={vid.slots} min={1} max={6}
                      onChange={v => setVid(s => ({ ...s, slots: v, start_at: '' }))} />
                    <span className="text-[12.5px] font-bold text-ink-600">{vid.slots * 30} minutes</span>
                  </div>
                </Field>
                <Field label="Pick a slot" required>
                  <SlotPicker days={slots.days} value={vid.start_at} spanUnits={vid.slots}
                    onPick={v => setVid(s => ({ ...s, start_at: v }))} />
                </Field>
                <Field label="Subject / focus">
                  <Select value={vid.subject} placeholder="General strategy" options={m.subjects || []}
                    onChange={e => setVid(s => ({ ...s, subject: e.target.value }))} />
                </Field>
                <Field label="Pre-session agenda" required
                  hint="The mentor reads this before accepting.">
                  <Textarea rows={3} value={vid.agenda}
                    onChange={e => setVid(s => ({ ...s, agenda: e.target.value }))}
                    placeholder="My GS-II answers score 6/15 on federalism. I'll send two copies beforehand — please focus on structure and intros." />
                </Field>
                <div className="rounded-2xl border border-ink-200 bg-ink-100/70 p-3.5">
                  <Toggle checked={vid.is_anonymous}
                    onChange={v => setVid(s => ({ ...s, is_anonymous: v }))}
                    label={<span className="inline-flex items-center gap-1.5 text-ink-900">
                      <Icon.Incognito size={14} className="text-nex-600" />Anonymous Mode</span>}
                    hint={<span className="text-ink-500">Hide your name and photo from the mentor for this call.</span>} />
                </div>
                {retainer?.session_credits_left > 0 && (
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-mint-50 px-3.5 py-3">
                    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={vid.use_credit}
                      onChange={e => setVid(s => ({ ...s, use_credit: e.target.checked }))} />
                    <span className="text-[12px] leading-snug text-mint-700">
                      <span className="font-extrabold">Redeem a retainer credit</span> — uses 1 of your{' '}
                      {retainer.session_credits_left} remaining calls.
                    </span>
                  </label>
                )}
              </>
            )}

            {booking === 'offline_eval' && (
              <>
                <Alert tone="gold" icon={<Icon.Clock size={15} />}>
                  Guaranteed turnaround: <span className="font-extrabold">{svc.sla_hours} hours</span>.
                  Miss it and you're refunded automatically.
                </Alert>
                <PdfPick file={ev.file} onPick={f => setEv(s => ({ ...s, file: f }))}
                  label="Upload answer PDF" hint="One PDF · max 10 MB" />
                <Field label="How many answers are in this PDF?"
                  hint={`Charged ${inr(svc.price)} per answer.`}>
                  <div className="flex items-center gap-3">
                    <Stepper value={ev.answer_count} min={1} max={25}
                      onChange={v => setEv(s => ({ ...s, answer_count: v }))} />
                    <span className="text-[13px] font-extrabold text-ink-900 tnum">
                      = {inr(svc.price * ev.answer_count)}
                    </span>
                  </div>
                </Field>
                <Field label="Paper / subject">
                  <Select value={ev.subject} placeholder="Select" options={m.subjects || []}
                    onChange={e => setEv(s => ({ ...s, subject: e.target.value }))} />
                </Field>
                <Field label="Anything the evaluator should know?">
                  <Textarea rows={2} value={ev.agenda}
                    onChange={e => setEv(s => ({ ...s, agenda: e.target.value }))}
                    placeholder="First attempt at a 10-marker. Be harsh about structure." />
                </Field>
                {retainer?.eval_credits_left >= ev.answer_count && (
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-mint-50 px-3.5 py-3">
                    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={ev.use_credit}
                      onChange={e => setEv(s => ({ ...s, use_credit: e.target.checked }))} />
                    <span className="text-[12px] leading-snug text-mint-700">
                      <span className="font-extrabold">Redeem {ev.answer_count} evaluation credit
                      {ev.answer_count > 1 ? 's' : ''}</span> — {retainer.eval_credits_left} left.
                    </span>
                  </label>
                )}
              </>
            )}

            {booking === 'live_eval' && (
              <>
                <Alert tone="gold" icon={<Icon.Board size={15} />}>
                  45 minutes on a shared whiteboard. Upload the copy now — the mentor reads it
                  before you meet.
                </Alert>
                <PdfPick file={live.file} onPick={f => setLive(s => ({ ...s, file: f }))}
                  label="Upload the copy to review" hint="PDF only · max 10 MB" />
                <Field label="Pick a 45-minute window" required>
                  <SlotPicker days={slots.days} value={live.start_at} spanUnits={2}
                    onPick={v => setLive(s => ({ ...s, start_at: v }))} />
                </Field>
                <Field label="Paper / subject">
                  <Select value={live.subject} placeholder="Select" options={m.subjects || []}
                    onChange={e => setLive(s => ({ ...s, subject: e.target.value }))} />
                </Field>
                <Field label="What should we fix?">
                  <Textarea rows={2} value={live.agenda}
                    onChange={e => setLive(s => ({ ...s, agenda: e.target.value }))}
                    placeholder="Rebuild this answer with me — I know the content but the structure collapses." />
                </Field>
              </>
            )}

            {booking === 'retainer' && (
              <>
                <div className="rounded-2xl border border-mint-200 bg-mint-50 p-4">
                  <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-mint-700">
                    {svc.deliverables}
                  </p>
                  <div className="mt-3.5 grid grid-cols-3 gap-2">
                    {[['Calls', svc.session_credits], ['Evaluations', svc.eval_credits],
                      ['Valid', `${svc.validity_days}d`]].map(([l, v]) => (
                      <div key={l} className="rounded-xl bg-white/70 px-3 py-2 text-center">
                        <p className="text-[18px] font-extrabold leading-none text-mint-700 tnum">{v}</p>
                        <p className="mt-1 text-[9.5px] font-extrabold uppercase tracking-wide text-mint-600">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Alert tone="ink" icon={<Icon.Info size={15} />}>
                  Credits are redeemed against this mentor's normal slots. Anything unused when
                  the {svc.validity_days} days run out is liquidated under the published rule.
                </Alert>
              </>
            )}
          </div>
        )}

        {step === 'pay' && svc && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink-200 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={m.name} initials={m.initials} hue={m.hue} photo={m.photo} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold text-ink-900">{m.name}</p>
                  <p className="text-[11.5px] text-ink-500">{svc.label}</p>
                </div>
              </div>
              <dl className="mt-4 space-y-2 border-t border-ink-100 pt-3.5 text-[12.5px]">
                {booking === 'video_1on1' && <>
                  <Row k="When" v={shortStamp(vid.start_at)} />
                  <Row k="Duration" v={`${vid.slots * 30} minutes`} />
                  {vid.subject && <Row k="Focus" v={vid.subject} />}
                  {vid.is_anonymous && <Row k="Privacy" v="Anonymous Mode on" tone="gold" />}
                </>}
                {booking === 'offline_eval' && <>
                  <Row k="Answers" v={ev.answer_count} />
                  <Row k="File" v={ev.file?.name} />
                  <Row k="Turnaround" v={`${svc.sla_hours} hours, guaranteed`} />
                </>}
                {booking === 'live_eval' && <>
                  <Row k="When" v={shortStamp(live.start_at)} />
                  <Row k="Duration" v="45 minutes" />
                  <Row k="Copy" v={live.file?.name} />
                </>}
                {booking === 'retainer' && <>
                  <Row k="Package" v={svc.package_title} />
                  <Row k="Includes" v={`${svc.session_credits} calls · ${svc.eval_credits} evaluations`} />
                  <Row k="Valid for" v={`${svc.validity_days} days`} />
                </>}
              </dl>
            </div>

            {!usingCredit && (
              <>
                <div>
                  <p className="mb-2 text-[12px] font-extrabold text-ink-700">Payment method</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PAY_METHODS.map(p => (
                      <button key={p.key} onClick={() => setPay(p.key)}
                        className={`focusable rounded-xl border p-2.5 text-center transition ${pay === p.key ? 'border-nex-500 bg-nex-50 ring-1 ring-nex-500' : 'border-ink-200 hover:bg-ink-25'}`}>
                        <p.icon size={16} className={`mx-auto ${pay === p.key ? 'text-nex-600' : 'text-ink-400'}`} />
                        <p className="mt-1.5 text-[11.5px] font-extrabold text-ink-900">{p.label}</p>
                        <p className="text-[9.5px] text-ink-400">{p.hint}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl bg-nex-800 p-4">
                  <div className="flex items-baseline justify-between text-[12.5px] text-white/75">
                    <span>Service total</span><span className="tnum">{inr(amount)}</span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between border-t border-white/15 pt-2.5">
                    <span className="text-[13px] font-extrabold text-white">You pay now</span>
                    <span className="text-[22px] font-extrabold text-white tnum">{inr(amount)}</span>
                  </div>
                </div>
              </>
            )}

            <EscrowNote hours={cat.escrow_hours} />
            <p className="text-[11px] leading-relaxed text-ink-400">
              Demo build — no real payment gateway is connected, so confirming captures the
              order into escrow without charging anything.
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

function Row({ k, v, tone }) {
  if (!v) return null
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">{k}</dt>
      <dd className={`text-right font-extrabold ${tone === 'gold' ? 'text-gold-700' : 'text-ink-900'}`}>{v}</dd>
    </div>
  )
}
