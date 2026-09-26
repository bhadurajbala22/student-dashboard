import { Link } from 'react-router-dom'

/**
 * The ToppersDeck mark: a fanned deck of three cards with a double chevron
 * rising off the front one. Drawn as SVG rather than loaded from the PNG so it
 * stays crisp at every size and keeps its edges on a dark band.
 */
export function Mark({ size = 34 }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} fill="none"
      className="shrink-0" role="img" aria-label="ToppersDeck">
      <rect x="6" y="7" width="20" height="27" rx="5" fill="#000814"
        transform="rotate(-15 16 20.5)" />
      <rect x="9.5" y="6.5" width="21" height="28" rx="5.5" fill="#003566"
        transform="rotate(-7.5 20 20.5)" />
      <rect x="13" y="5" width="23" height="30" rx="6.5" fill="#FFC300" />
      <path d="M18.6 22.6 24.5 17.1l5.9 5.5M18.6 28.6 24.5 23.1l5.9 5.5"
        stroke="#001D3D" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Brand({ compact, light, to = '/', size = 34 }) {
  const Tag = to ? Link : 'div'
  return (
    <Tag to={to} className="focusable tap inline-flex items-center gap-2.5 rounded-xl">
      <Mark size={size} />
      {!compact && (
        <span className="leading-none">
          <span className={`block text-[18px] font-extrabold tracking-[-0.03em] ${light ? 'text-white' : 'text-ink-900'}`}>
            Toppers<span className={light ? 'text-gold-400' : 'text-gold-600'}>Deck</span>
          </span>
          <span className={`mt-1 block whitespace-nowrap text-[8.5px] font-extrabold uppercase tracking-[0.18em] ${light ? 'text-white/55' : 'text-ink-400'}`}>
            Learn. Rise. Lead.
          </span>
        </span>
      )}
    </Tag>
  )
}
