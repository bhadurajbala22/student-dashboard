import { Link } from 'react-router-dom'
import { ESCROW_LABEL, ESCROW_TONE, SERVICE_TONE, STATUS_TONE, countdown, inr, relative, shortStamp } from '../format'
import { Icon } from './icons'
import { Avatar, Badge, BadgeRow, Button, Stars } from './ui'

export const CATEGORY_META = {
  faculty: { label: 'Premium Faculty', icon: Icon.Cap, tone: 'violet' },
  ranker: { label: 'Recent Ranker', icon: Icon.Sparkle, tone: 'gold' },
  veteran: { label: 'Veteran Aspirant', icon: Icon.Route, tone: 'nex' },
}

export const SERVICE_ICON = {
  video_1on1: Icon.Video,
  offline_eval: Icon.Pdf,
  live_eval: Icon.Board,
  retainer: Icon.Package,
}

/** Static classes — Tailwind only generates what it can see literally. */
export const SERVICE_SWATCH = {
  video_1on1: 'bg-nex-50 text-nex-600',
  offline_eval: 'bg-gold-50 text-gold-600',
  live_eval: 'bg-gold-50 text-gold-600',
  retainer: 'bg-mint-50 text-mint-600',
}

export const SERVICE_NAME = {
  video_1on1: '1-on-1 video',
  offline_eval: 'Copy evaluation',
  live_eval: 'Live copy review',
  retainer: 'Monthly retainer',
}

export function ServiceChip({ kind, price, unit, size = 'md' }) {
  const I = SERVICE_ICON[kind] || Icon.File
  return (
    <Badge tone={SERVICE_TONE[kind]} icon={<I size={11} />} size={size}>
      {price !== undefined ? `${inr(price)}${unit ? ` ${unit}` : ''}` : SERVICE_NAME[kind]}
    </Badge>
  )
}

export function EscrowChip({ state, hours }) {
  if (!state) return null
  return (
    <Badge tone={ESCROW_TONE[state]} icon={<Icon.Lock size={11} />}>
      {ESCROW_LABEL[state]}{state === 'held' && hours ? ` · ${countdown(hours)}` : ''}
    </Badge>
  )
}

export function SlaChip({ hours, breached, hoursLeft }) {
  if (breached) return <Badge tone="rose" icon={<Icon.Alert size={11} />}>SLA missed</Badge>
  if (hoursLeft === null || hoursLeft === undefined) {
    return <Badge tone="ink" icon={<Icon.Clock size={11} />}>{hours}h SLA</Badge>
  }
  const tone = hoursLeft < 6 ? 'rose' : hoursLeft < 18 ? 'gold' : 'mint'
  return (
    <Badge tone={tone} icon={<Icon.Clock size={11} />}>
      {countdown(hoursLeft)} left of {hours}h
    </Badge>
  )
}

export function StatusChip({ status, label }) {
  return <Badge tone={STATUS_TONE[status] || 'ink'}>{label || status}</Badge>
}

/* ───────────────────────────────────────────── mentor discovery card */
export function MentorCard({ m, base = '/app/mentors' }) {
  const cat = CATEGORY_META[m.category] || CATEGORY_META.veteran
  const prices = Object.entries(m.prices || {})
  const cheapest = prices.length ? Math.min(...prices.map(([, v]) => v)) : null

  return (
    <Link to={`${base}/${m.id}`}
      className="surface group flex flex-col p-5 text-center transition duration-200 hover:-translate-y-1 hover:border-nex-200 hover:lift">
      <div className="flex justify-center">
        <Avatar name={m.name} initials={m.initials} hue={m.hue} photo={m.photo} size={68} />
      </div>

      <h3 className="mt-3.5 flex items-center justify-center gap-1.5 text-[15px] font-extrabold text-ink-900">
        <span className="truncate">{m.name}</span>
        {m.is_verified && (
          <Icon.Shield size={13} className="shrink-0 text-nex-600" title="ID verified" />
        )}
      </h3>
      <p className="mt-1 flex items-center justify-center gap-1.5 text-[11.5px] font-bold text-ink-500">
        <cat.icon size={11} /> {cat.label}
        <span className="text-ink-300">·</span>
        <span className="font-semibold">{m.city}</span>
      </p>

      <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-ink-600">{m.headline}</p>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        <BadgeRow badges={m.badges} max={2} size="sm" />
      </div>

      {/* the service rows, Topmate-style: label left, price right */}
      <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3.5 text-left">
        {prices.slice(0, 3).map(([kind, price]) => {
          const I = SERVICE_ICON[kind]
          const unit = { video_1on1: '30 min', offline_eval: 'per answer',
                         live_eval: '45 min', retainer: 'per month' }[kind]
          return (
            <div key={kind} className="flex items-center gap-2 text-[11.5px]">
              <I size={13} className="shrink-0 text-ink-400" />
              <span className="min-w-0 flex-1 truncate font-semibold text-ink-600">
                {SERVICE_NAME[kind]}
              </span>
              <span className="shrink-0 font-extrabold text-ink-900 tnum">{inr(price)}</span>
              <span className="shrink-0 text-[10px] text-ink-400">/ {unit}</span>
            </div>
          )
        })}
        {prices.length > 3 && (
          <p className="pt-0.5 text-[11px] font-bold text-ink-400">
            +{prices.length - 3} more service{prices.length - 3 > 1 ? 's' : ''}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3.5">
        <span className="inline-flex items-center gap-1.5">
          {m.rating ? (
            <>
              <Stars value={m.rating} size={11} showValue={false} />
              <span className="text-[11.5px] font-extrabold text-ink-800 tnum">{m.rating}</span>
              <span className="text-[11px] text-ink-400 tnum">({m.rating_count})</span>
            </>
          ) : <span className="text-[11.5px] font-bold text-ink-400">New</span>}
        </span>
        <span className="text-[11.5px] font-semibold text-ink-500">
          {m.next_available
            ? <>Free <span className="font-extrabold text-mint-600">{relative(m.next_available)}</span></>
            : m.service_kinds?.includes('offline_eval') ? 'Async only' : '—'}
        </span>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────────────── order row */
export function OrderRow({ o, viewerRole, onOpen, dense }) {
  const peer = viewerRole === 'mentor' ? o.student : o.mentor
  const I = SERVICE_ICON[o.service_kind] || Icon.File
  return (
    <button onClick={() => onOpen?.(o)}
      className="surface focusable flex w-full items-start gap-3.5 p-4 text-left transition hover:border-nex-200 hover:lift">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${SERVICE_SWATCH[o.service_kind] || SERVICE_SWATCH.video_1on1}`}>
        <I size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-[13.5px] font-extrabold text-ink-900">{o.title}</h4>
          <StatusChip status={o.status} label={o.status_label} />
          {o.is_anonymous && (
            <Badge tone="dark" icon={<Icon.Incognito size={11} />} size="sm">Anonymous</Badge>
          )}
          {o.paid_with_credit && <Badge tone="mint" size="sm">Credit</Badge>}
        </div>
        <p className="mt-1 truncate text-[12px] text-ink-500">
          <Avatar name={peer?.name} initials={peer?.initials} hue={peer?.hue}
            anonymous={peer?.anonymous} size={15} />
          <span className="ml-1.5 align-middle font-semibold">{peer?.name}</span>
          {o.subject && <span className="ml-1.5 align-middle">· {o.subject}</span>}
          <span className="ml-1.5 align-middle font-mono text-[11px] text-ink-400">{o.reference}</span>
        </p>
        {!dense && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {o.start_at && (
              <Badge tone="ink" icon={<Icon.Calendar size={11} />}>{shortStamp(o.start_at)}</Badge>
            )}
            {o.service_kind === 'offline_eval' && o.status !== 'approved' && (
              <SlaChip hours={o.sla_hours} breached={o.sla_breached} hoursLeft={o.sla_hours_left} />
            )}
            <EscrowChip state={o.escrow_state} hours={o.hours_to_release} />
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[14px] font-extrabold text-ink-900 tnum">
          {o.paid_with_credit ? 'Credit' : inr(o.amount)}
        </p>
        {viewerRole === 'mentor' && !o.paid_with_credit && (
          <p className="text-[10.5px] font-semibold text-ink-400 tnum">you get {inr(o.mentor_payout)}</p>
        )}
      </div>
    </button>
  )
}

/* ─────────────────────────────────────────── escrow trust explainer */
export function EscrowNote({ hours = 72, className = '' }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl bg-mint-50 px-4 py-3 ${className}`}>
      <Icon.Shield size={17} className="mt-px shrink-0 text-mint-600" />
      <p className="text-[12px] leading-relaxed text-mint-700">
        <span className="font-extrabold">Escrow protected.</span> Your money is held by the
        platform and reaches the mentor only after the service is delivered and your {hours}-hour
        review window closes. Raise an issue in that window and the funds freeze.
      </p>
    </div>
  )
}

export function VaultNote({ days = 7, className = '' }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl bg-ink-100 px-4 py-3 ${className}`}>
      <Icon.Lock size={17} className="mt-px shrink-0 text-ink-500" />
      <p className="text-[12px] leading-relaxed text-ink-600">
        <span className="font-extrabold">Internal vault.</span> Live sessions are recorded to
        platform storage for quality and dispute evidence. You can stream for {days} days;
        neither you nor the mentor can download the file.
      </p>
    </div>
  )
}
