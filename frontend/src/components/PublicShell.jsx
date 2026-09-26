import { Link, Outlet, useLocation } from 'react-router-dom'
import { Brand } from './Brand'
import { Icon } from './icons'
import SiteHeader from './SiteHeader'
import { Button } from './ui'
import { useMeta } from '../meta'

const FOOTER_NAV = [
  ['Book', [
    ['Browse mentors', '/mentors'],
    ['1-on-1 video', '/mentors?service=video_1on1'],
    ['Copy evaluation', '/mentors?service=offline_eval'],
    ['Live copy review', '/mentors?service=live_eval'],
  ]],
  ['Mentors', [
    ['Premium faculty', '/mentors?category=faculty'],
    ['Recent rankers', '/mentors?category=ranker'],
    ['Veteran aspirants', '/mentors?category=veteran'],
    ['Start mentoring', '/join/mentor'],
  ]],
  ['Account', [
    ['Sign in', '/login'],
    ['Create an account', '/join/aspirant'],
    ['How it works', '/#how-it-works'],
  ]],
]

export function SiteFooter({ meta }) {
  return (
    <footer className="border-t-4 border-gold-400 bg-ink-50/60">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]">
          <div>
            <Brand />
            <p className="mt-4 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
              {meta?.tagline || 'Verified mentorship, evaluation and strategy for Civil Services aspirants.'}
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-3 py-1.5 text-[11px] font-extrabold text-mint-600">
              <Icon.Shield size={12} /> Escrow protected
            </p>
          </div>

          {FOOTER_NAV.map(([title, links]) => (
            <div key={title}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-ink-400">
                {title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {links.map(([label, to]) => (
                  <li key={label}>
                    {to.startsWith('/#') ? (
                      <a href={to} className="tap text-[12.5px] font-semibold text-ink-600 transition hover:text-ink-900">
                        {label}
                      </a>
                    ) : (
                      <Link to={to} className="tap text-[12.5px] font-semibold text-ink-600 transition hover:text-ink-900">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ink-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] text-ink-400">
            All times {meta?.timezone || 'IST'} · demo build, no live payment gateway
          </p>
          <p className="text-[11.5px] text-ink-400">© {new Date().getFullYear()} ToppersDeck</p>
        </div>
      </div>
    </footer>
  )
}

/**
 * Chrome for pages a signed-out visitor can browse. Everything here is
 * readable without an account — we only ask for details at the point of
 * booking, so nobody fills a form before they know what's on offer.
 */
export default function PublicShell() {
  const location = useLocation()
  const meta = useMeta()

  // sign-in/up should bring them back to whatever they were looking at
  const next = encodeURIComponent(location.pathname + location.search)

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader next={next} />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter meta={meta} />
    </div>
  )
}

/**
 * The prompt a guest sees when they try to act. Carries the thing they were
 * about to do into the signup flow so they land back on it afterwards.
 */
export function GuestGate({ open, onClose, mentorName, serviceLabel, next, action = 'book' }) {
  if (!open) return null
  const q = `?next=${encodeURIComponent(next)}`
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-ink-950/50 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}>
      <div className="a-rise w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={e => e.stopPropagation()}>
        <div className="relative overflow-hidden bg-ink-900 px-6 py-7 text-center">
          <div className="hatch pointer-events-none absolute inset-0" />
          <div className="relative">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold-400 text-ink-950">
              <Icon.Lock size={22} />
            </span>
            <h3 className="mt-4 text-[19px] font-extrabold tracking-[-0.02em] text-white">
              {action === 'book' ? 'Create a free account to book' : 'Sign in to message'}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-white/80">
              {serviceLabel && mentorName
                ? <>You're booking <span className="font-extrabold text-white">{serviceLabel}</span> with{' '}
                    <span className="font-extrabold text-white">{mentorName}</span>.</>
                : <>You'll be back here in a moment.</>}
            </p>
          </div>
        </div>

        <div className="px-6 py-6">
          <ul className="space-y-2.5">
            {[
              'Free to register — you only pay when you book',
              'Your money is held in escrow until the session is delivered',
              'Takes about two minutes',
            ].map(t => (
              <li key={t} className="flex items-start gap-2.5 text-[13px] font-semibold text-ink-700">
                <Icon.Check size={16} className="mt-0.5 shrink-0 text-mint-600" />{t}
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2.5">
            <Button as={Link} to={`/join/aspirant${q}`} size="lg" className="w-full"
              icon={<Icon.Sparkle size={16} />}>
              Create my free account
            </Button>
            <Button as={Link} to={`/login${q}`} size="lg" variant="outline" className="w-full">
              I already have an account
            </Button>
            <button onClick={onClose}
              className="w-full py-2 text-[12.5px] font-bold text-ink-500 transition hover:text-ink-800">
              Keep looking around
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
