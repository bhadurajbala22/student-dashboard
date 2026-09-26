export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const inr = (n) => {
  if (n === null || n === undefined || n === '') return '—'
  if (typeof n === 'string') return n
  return `₹${Number(n).toLocaleString('en-IN')}`
}

/** Backend datetimes are naive IST wall-clock strings; render them as written. */
export function parseIst(value) {
  if (!value) return null
  const [date, time = '00:00:00'] = value.split('T')
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm, ss] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh || 0, mm || 0, ss || 0)
}

export function clock(value) {
  const d = parseIst(value)
  if (!d) return ''
  let h = d.getHours()
  const suffix = h >= 12 ? 'pm' : 'am'
  h = h % 12 || 12
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`
}

export const dayStamp = (v) => {
  const d = parseIst(v)
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : ''
}

export const fullStamp = (v) => {
  const d = parseIst(v)
  return d ? `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} · ${clock(v)}` : ''
}

export const shortStamp = (v) => {
  const d = parseIst(v)
  return d ? `${DAY_SHORT[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${clock(v)}` : ''
}

export function relative(value) {
  const d = parseIst(value)
  if (!d) return ''
  const diff = (d - new Date()) / 1000
  const abs = Math.abs(diff)
  const ago = diff < 0
  const fmt = (n, unit) => {
    const label = `${n} ${unit}${n === 1 ? '' : 's'}`
    return ago ? `${label} ago` : `in ${label}`
  }
  if (abs < 60) return ago ? 'just now' : 'any moment'
  if (abs < 3600) return fmt(Math.round(abs / 60), 'min')
  if (abs < 86400) return fmt(Math.round(abs / 3600), 'hour')
  if (abs < 86400 * 30) return fmt(Math.round(abs / 86400), 'day')
  return dayStamp(value)
}

/** "2d 4h" / "9h 20m" / "14m" — for SLA and escrow countdowns. */
export function countdown(hours) {
  if (hours === null || hours === undefined) return ''
  const total = Math.max(0, hours)
  if (total >= 24) {
    const d = Math.floor(total / 24)
    const h = Math.round(total % 24)
    return `${d}d ${h}h`
  }
  if (total >= 1) {
    const h = Math.floor(total)
    const m = Math.round((total - h) * 60)
    return m ? `${h}h ${m}m` : `${h}h`
  }
  return `${Math.max(1, Math.round(total * 60))}m`
}

export function chatStamp(value) {
  const d = parseIst(value)
  if (!d) return ''
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return clock(value)
  const y = new Date(today.getTime() - 86400000)
  if (d.toDateString() === y.toDateString()) return `Yesterday ${clock(value)}`
  return `${dayStamp(value)}, ${clock(value)}`
}

export const minutesLabel = (m) =>
  !m ? '' : m >= 60 ? `${m % 60 === 0 ? m / 60 : (m / 60).toFixed(1)} hr` : `${m} min`

export const mbLabel = (mb) => (mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(mb * 1024)} KB`)

export const SERVICE_TONE = {
  video_1on1: 'nex',
  offline_eval: 'gold',
  live_eval: 'violet',
  retainer: 'mint',
}

export const STATUS_TONE = {
  pending: 'gold', confirmed: 'nex', delivered: 'violet', approved: 'mint',
  declined: 'rose', cancelled: 'ink', submitted: 'nex', evaluating: 'gold',
  ready: 'mint', refunded_sla: 'rose', disputed: 'rose', active: 'mint', expired: 'ink',
}

export const ESCROW_TONE = {
  held: 'gold', released: 'mint', refunded: 'ink', frozen: 'rose', liquidated: 'ink',
}

export const ESCROW_LABEL = {
  held: 'In escrow', released: 'Paid out', refunded: 'Refunded',
  frozen: 'Frozen', liquidated: 'Liquidated',
}

const TITLES = new Set(['dr', 'dr.', 'prof', 'prof.', 'mr', 'mr.', 'ms', 'ms.', 'mrs', 'mrs.',
  'shri', 'smt', 'smt.', 'lt', 'lt.', 'col', 'col.', 'capt', 'capt.', 'maj', 'maj.',
  'adv', 'adv.', 'ca', 'shri.'])

/** "Dr. Ananya R." → "Ananya"; "Lt. Col. Harpreet Gill (Retd.)" → "Harpreet" */
export function firstName(full = '') {
  const parts = String(full).split(/\s+/).filter(Boolean)
  for (const part of parts) {
    const bare = part.replace(/[(),.]/g, '')
    if (!bare) continue
    if (TITLES.has(part.toLowerCase())) continue
    if (bare.length === 1) continue          // a lone initial isn't a name
    return bare
  }
  return parts[0]?.replace(/[(),.]/g, '') || ''
}
