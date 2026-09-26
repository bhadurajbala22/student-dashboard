import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'

/* ═══════════════════════════════════════════════════════════════ atoms */
export function Avatar({ name = '', initials, hue = 232, size = 40, photo, ring, anonymous }) {
  const text = initials || (name.replace(/[.,()]/g, ' ').split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('') || '?')
  if (anonymous) {
    return (
      <span className="inline-grid shrink-0 place-items-center rounded-full bg-ink-200 text-ink-600"
        style={{ width: size, height: size }} title="Anonymous aspirant">
        <Icon.Incognito size={size * 0.52} />
      </span>
    )
  }
  if (photo) {
    return <img src={photo.startsWith('http') ? photo : `/media/${photo}`} alt={name}
      className={`shrink-0 rounded-full object-cover ${ring ? 'ring-2 ring-white' : ''}`}
      style={{ width: size, height: size }} />
  }
  // Generated identities stay inside the brand's navy-to-blue band, so a wall
  // of initials still reads as one palette.
  const h = 200 + ((hue % 360) / 360) * 32
  const sat = 66 + ((hue * 7) % 24)
  const light = 30 + ((hue * 3) % 12)
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold text-white ${ring ? 'ring-2 ring-white' : ''}`}
      style={{
        width: size, height: size, fontSize: size * 0.36,
        background: `linear-gradient(145deg, hsl(${h} ${sat}% ${light}%), hsl(${h + 28} ${sat + 8}% ${light - 13}%))`,
        boxShadow: 'inset 0 1px 0 rgb(255 255 255 / .25), 0 8px 24px rgb(0 0 0 / .28)',
      }}
      title={name}
    >{text}</span>
  )
}

const TONES = {
  nex: 'bg-nex-50 text-nex-700',
  gold: 'bg-gold-50 text-gold-700',
  mint: 'bg-mint-50 text-mint-700',
  violet: 'bg-gold-50 text-gold-700',
  rose: 'bg-nex-50 text-nex-700',
  ink: 'bg-ink-100 text-ink-600',
  dark: 'bg-ink-800 text-ink-25',
  rank: 'bg-gradient-to-r from-nex-600 to-nex-800 text-white',
  verified: 'bg-mint-50 text-mint-700',
  kyc: 'bg-nex-50 text-nex-700',
  faculty: 'bg-gold-50 text-gold-700',
}

export function Badge({ children, tone = 'ink', icon, className = '', size = 'md' }) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-[11px]'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${pad} ${TONES[tone] || tone} ${className}`}>
      {icon}{children}
    </span>
  )
}

export function BadgeRow({ badges = [], max = 4, size }) {
  const ICONS = {
    rank: <Icon.Sparkle size={11} />, verified: <Icon.Check size={11} />,
    kyc: <Icon.Shield size={11} />, faculty: <Icon.Cap size={11} />,
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {badges.slice(0, max).map((b, i) => (
        <Badge key={i} tone={b.tone} icon={ICONS[b.tone]} size={size}>{b.label}</Badge>
      ))}
    </span>
  )
}

const BTN = {
  primary: 'bg-nex-600 text-white hover:bg-nex-700 shadow-sm shadow-nex-600/30 disabled:bg-ink-200 disabled:text-ink-400 disabled:shadow-none',
  dark: 'bg-ink-900 text-ink-25 hover:bg-ink-950 disabled:bg-ink-300 disabled:text-ink-500',
  gold: 'bg-gold-400 text-ink-950 hover:bg-gold-300 shadow-sm shadow-gold-500/40 disabled:bg-ink-200 disabled:text-ink-400',
  mint: 'bg-mint-600 text-white hover:bg-mint-700 disabled:bg-ink-200 disabled:text-ink-400',
  outline: 'bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300 disabled:text-ink-400',
  soft: 'bg-nex-50 text-nex-700 hover:bg-nex-100 disabled:text-nex-300',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:text-ink-300',
  danger: 'bg-white text-nex-600 ring-1 ring-inset ring-nex-200 hover:bg-nex-50',
  glass: 'bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20 backdrop-blur-sm',
}
const SIZE = {
  xs: 'h-7 px-2.5 text-[11.5px] gap-1 rounded-lg',
  sm: 'h-9 px-3.5 text-[12.5px] gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-[13.5px] gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[14.5px] gap-2 rounded-xl',
  pill: 'h-11 px-6 text-[13.5px] gap-2 rounded-full',
  pilllg: 'h-13 px-7 text-[15px] gap-2 rounded-full',
}

export function Button({ variant = 'primary', size = 'md', children, className = '',
  loading, icon, iconRight, as: Tag = 'button', ...rest }) {
  return (
    <Tag
      className={`focusable tap inline-flex shrink-0 items-center justify-center font-bold transition-all duration-150 active:scale-[.97] disabled:cursor-not-allowed disabled:active:scale-100 ${BTN[variant]} ${SIZE[size]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Spinner size={15} /> : icon}
      {children}
      {iconRight}
    </Tag>
  )
}

export function Spinner({ size = 18, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export const Card = ({ children, className = '', pad = 'p-5', as: Tag = 'div', ...rest }) => (
  <Tag className={`surface ${pad} ${className}`} {...rest}>{children}</Tag>
)

export function SectionHead({ children, hint, action, icon, className = '' }) {
  return (
    <div className={`mb-4 flex items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[15.5px] font-extrabold text-ink-900">
          {icon}{children}
        </h2>
        {hint && <p className="mt-0.5 text-[12.5px] leading-snug text-ink-500">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function Stars({ value = 0, size = 14, count, onRate, showValue = true, light }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-gold-400">
      {[1, 2, 3, 4, 5].map(n => (
        onRate ? (
          <button key={n} type="button" onClick={() => onRate(n)}
            className="focusable tap rounded p-1 transition hover:scale-110" aria-label={`${n} star`}>
            <Icon.Star filled={n <= value} size={size + 10} />
          </button>
        ) : <Icon.Star key={n} filled={n <= Math.round(value)} size={size} />
      ))}
      {showValue && value ? (
        <span className={`ml-1 text-[12px] font-extrabold tnum ${light ? 'text-gold-200' : 'text-ink-800'}`}>{value}</span>
      ) : null}
      {count !== undefined && (
        <span className={`text-[11.5px] font-semibold tnum ${light ? 'text-ink-400' : 'text-ink-400'}`}>({count})</span>
      )}
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════ inputs */
export function Field({ label, hint, error, required, children, className = '', counter }) {
  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[12.5px] font-bold text-ink-700">
            {label}{required && <span className="ml-0.5 text-nex-500">*</span>}
          </span>
          {counter && <span className="text-[11px] font-medium text-ink-400 tnum">{counter}</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1.5 block text-[11.5px] leading-snug text-ink-500">{hint}</span>}
      {error && <span className="mt-1.5 block text-[11.5px] font-semibold text-nex-600">{error}</span>}
    </label>
  )
}

export function PhotoPicker({ name, initials, hue, photo, onPick, busy, size = 76 }) {
  const ref = useRef(null)
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
      <div className="relative shrink-0">
        <Avatar name={name} initials={initials} hue={hue} photo={photo} size={size} />
        <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-gold-400 text-ink-950 ring-4 ring-ink-50">
          {busy ? <Spinner size={13} /> : <Icon.Upload size={13} />}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-extrabold text-ink-900">Profile photo</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-500">
          JPG, PNG or WebP · max 5 MB. A square image works best.
        </p>
        <button type="button" disabled={busy} onClick={() => ref.current?.click()}
          className="focusable mt-2 rounded-lg text-[12px] font-extrabold text-nex-600 transition hover:text-nex-700 disabled:opacity-50">
          {photo ? 'Change photo' : 'Upload photo'}
        </button>
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onPick?.(file)
            e.target.value = ''
          }} />
      </div>
    </div>
  )
}

const CTRL = 'w-full rounded-xl border border-ink-200 bg-ink-100/60 text-[13.5px] text-ink-900 placeholder:text-ink-400 outline-none transition focus:border-nex-400 focus:bg-ink-100 focus:ring-4 focus:ring-nex-500/20 disabled:bg-ink-50 disabled:text-ink-400'

export const Input = ({ className = '', prefix, suffix, ...rest }) => (
  (prefix || suffix) ? (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-bold text-ink-400">{prefix}</span>}
      <input className={`${CTRL} h-11 ${prefix ? 'pl-8' : 'pl-3.5'} ${suffix ? 'pr-14' : 'pr-3.5'} ${className}`} {...rest} />
      {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-ink-400">{suffix}</span>}
    </div>
  ) : <input className={`${CTRL} h-11 px-3.5 ${className}`} {...rest} />
)

export const Textarea = ({ className = '', rows = 3, ...rest }) => (
  <textarea rows={rows} className={`${CTRL} px-3.5 py-2.5 leading-relaxed ${className}`} {...rest} />
)

export function Select({ options = [], placeholder, className = '', ...rest }) {
  return (
    <div className="relative">
      <select className={`${CTRL} h-11 cursor-pointer appearance-none pl-3.5 pr-10 ${rest.value === '' ? 'text-ink-400' : ''} ${className}`} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => {
          const value = typeof o === 'object' ? o.value : o
          const label = typeof o === 'object' ? o.label : o
          return <option key={value} value={value}>{label}</option>
        })}
      </select>
      <Icon.ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
    </div>
  )
}

export function ChipGroup({ options, value = [], onChange, max, small }) {
  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt))
    else if (!max || value.length < max) onChange([...value, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const on = value.includes(opt)
        return (
          <button type="button" key={opt} onClick={() => toggle(opt)}
            className={`focusable tap rounded-full font-semibold transition ${small ? 'px-2.5 py-1.5 text-[11.5px]' : 'px-3.5 py-2 text-[12.5px]'} ${on
              ? 'bg-nex-600 text-white shadow-sm shadow-nex-600/25'
              : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-nex-50 hover:ring-nex-200'}`}>
            {on && <Icon.Check size={11} className="mr-1 inline-block align-[-1px]" />}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className="focusable flex w-full items-start gap-3 rounded-lg py-1 text-left disabled:opacity-50">
      <span className={`mt-0.5 flex h-5.5 w-10 shrink-0 items-center rounded-full p-0.5 transition ${checked ? 'bg-nex-600' : 'bg-ink-300'}`}>
        <span className={`h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4.5' : ''}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-ink-800">{label}</span>
        {hint && <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-500">{hint}</span>}
      </span>
    </button>
  )
}

export function Segmented({ options, value, onChange, className = '', full }) {
  return (
    <div className={`inline-flex rounded-xl bg-ink-100 p-1 ${full ? 'w-full' : ''} ${className}`}>
      {options.map(o => {
        const v = typeof o === 'object' ? o.value : o
        const l = typeof o === 'object' ? o.label : o
        const on = v === value
        return (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={`focusable tap flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-[12.5px] font-bold capitalize transition ${on ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'}`}>
            {l}
            {typeof o === 'object' && o.count !== undefined && (
              <span className={`ml-1.5 rounded-full px-1.5 py-px text-[10px] tnum ${on ? 'bg-nex-600/15 text-nex-700' : 'bg-ink-200 text-ink-600'}`}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Stepper({ value, onChange, min = 1, max = 20, suffix = '' }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-white p-1">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="focusable tap grid h-9 w-9 place-items-center rounded-lg text-ink-600 transition hover:bg-ink-100 disabled:text-ink-300"
        disabled={value <= min} aria-label="Decrease"><Icon.Minus size={15} /></button>
      <span className="min-w-14 text-center text-[13.5px] font-extrabold tnum">{value}{suffix}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
        className="focusable tap grid h-9 w-9 place-items-center rounded-lg text-ink-600 transition hover:bg-ink-100 disabled:text-ink-300"
        disabled={value >= max} aria-label="Increase"><Icon.Plus size={15} /></button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ feedback */
export function Modal({ open, onClose, title, subtitle, children, footer, width = 'max-w-lg', tone }) {
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-ink-950/50 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}>
      <div className={`a-rise w-full ${width} overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl`}
        onClick={e => e.stopPropagation()}>
        {title && (
          <div className={`flex items-start justify-between gap-4 border-b border-ink-200 px-6 py-4 ${tone === 'dark' ? 'bg-ink-950 text-white' : ''}`}>
            <div>
              <h3 className={`text-[16px] font-extrabold ${tone === 'dark' ? 'text-white' : 'text-ink-900'}`}>{title}</h3>
              {subtitle && <p className={`mt-0.5 text-[12.5px] ${tone === 'dark' ? 'text-ink-400' : 'text-ink-500'}`}>{subtitle}</p>}
            </div>
            <button onClick={onClose} aria-label="Close"
              className={`focusable tap grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${tone === 'dark' ? 'text-ink-400 hover:bg-white/10' : 'text-ink-400 hover:bg-ink-100 hover:text-ink-700'}`}>
              <Icon.X size={18} />
            </button>
          </div>
        )}
        <div className="max-h-[68vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-ink-200 bg-ink-25 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!open) return
    const esc = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-ink-950/50 backdrop-blur-sm" onClick={onClose}>
      <div className="a-slide flex h-full w-full max-w-[520px] flex-col bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-[16px] font-extrabold text-ink-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close"
            className="focusable tap grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-400 hover:bg-ink-100">
            <Icon.X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-200 bg-ink-25 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

const STAT_BG = {
  indigo:  'from-nex-500/14 to-nex-600/5',
  amber:   'from-gold-400/18 to-gold-500/5',
  violet:  'from-nex-800/12 to-nex-900/4',
  emerald: 'from-mint-500/12 to-mint-600/4',
}
const STAT_RULE = {
  indigo: 'bg-nex-600', amber: 'bg-gold-500', violet: 'bg-nex-800', emerald: 'bg-mint-500',
}

export function Stat({ label, value, hint, tone = 'indigo', icon }) {
  return (
    <div className="surface relative overflow-hidden p-4">
      <div className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${STAT_BG[tone]}`} />
      <span className={`absolute left-0 top-0 h-full w-[3px] ${STAT_RULE[tone]}`} />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-ink-500">
          {icon}{label}
        </div>
        <div className="mt-2 text-[27px] font-extrabold leading-none text-ink-900 tnum">{value}</div>
        {hint && <div className="mt-2 text-[11.5px] leading-snug text-ink-500">{hint}</div>}
      </div>
    </div>
  )
}

export function Empty({ title, hint, icon, action, compact }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-ink-25 px-6 text-center ${compact ? 'py-8' : 'py-14'}`}>
      {icon && <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-400 ring-1 ring-ink-200">{icon}</div>}
      <p className="text-[14px] font-extrabold text-ink-800">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-ink-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-20 text-ink-400">
      <Spinner /> <span className="text-[13px] font-bold">{label}…</span>
    </div>
  )
}

export const Skeleton = ({ className = '' }) => <div className={`skeleton rounded-xl ${className}`} />

const ALERT = {
  nex: 'bg-nex-50 text-nex-900',
  gold: 'bg-gold-50 text-gold-900',
  rose: 'bg-nex-50 text-nex-900',
  mint: 'bg-mint-50 text-mint-700',
  ink: 'bg-ink-100 text-ink-700',
  dark: 'bg-ink-950 text-ink-700',
}

export function Alert({ tone = 'nex', title, children, icon, className = '' }) {
  return (
    <div className={`flex gap-3 rounded-2xl px-4 py-3.5 text-[12.5px] leading-relaxed ${ALERT[tone]} ${className}`}>
      {icon !== null && <span className="mt-px shrink-0">{icon || <Icon.Info size={16} />}</span>}
      <div className="min-w-0">
        {title && <p className="font-extrabold">{title}</p>}
        <div className={title ? 'mt-1 opacity-90' : ''}>{children}</div>
      </div>
    </div>
  )
}

/* progress */
export function Bar({ value, max = 100, tone = 'nex', className = '' }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const bg = { nex: 'bg-nex-600', gold: 'bg-gold-500', mint: 'bg-mint-500', rose: 'bg-nex-500' }[tone]
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-ink-100 ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${bg}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Ring({ percent = 0, size = 44, stroke = 4, tone = 'nex', label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const colors = { nex: 'var(--color-nex-600)', mint: 'var(--color-mint-500)', gold: 'var(--color-gold-500)' }
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-ink-200)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors[tone]} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.22,.61,.36,1)' }} />
      </svg>
      <span className="absolute text-[10.5px] font-extrabold text-ink-700 tnum">{label ?? `${Math.round(percent)}%`}</span>
    </span>
  )
}

/* ═══════════════════════════════════════════════════════════════ toast */
let push = () => {}
export const toast = {
  success: (msg) => push({ msg, tone: 'mint' }),
  error: (msg) => push({ msg, tone: 'rose' }),
  info: (msg) => push({ msg, tone: 'dark' }),
}

export function ToastHost() {
  const [items, setItems] = useState([])
  const idRef = useRef(0)
  useEffect(() => {
    push = ({ msg, tone }) => {
      const id = ++idRef.current
      setItems(prev => [...prev, { id, msg, tone }])
      setTimeout(() => setItems(prev => prev.filter(i => i.id !== id)), 4600)
    }
  }, [])
  const bg = { mint: 'bg-mint-400 text-ink-25', rose: 'bg-nex-500 text-white', dark: 'bg-ink-800 text-ink-25' }
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2">
      {items.map(i => (
        <div key={i.id}
          className={`a-slide pointer-events-auto flex items-start gap-2.5 rounded-2xl px-4 py-3.5 text-[13px] font-semibold shadow-2xl ${bg[i.tone]}`}>
          {i.tone === 'mint' ? <Icon.Check size={16} /> : i.tone === 'rose' ? <Icon.Alert size={16} /> : <Icon.Info size={16} />}
          <span className="leading-snug">{i.msg}</span>
        </div>
      ))}
    </div>
  )
}
