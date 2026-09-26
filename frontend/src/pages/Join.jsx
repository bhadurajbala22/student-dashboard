import { Link, useLocation } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Icon } from '../components/icons'

const CARDS = [
  {
    to: '/join/aspirant', tag: 'For aspirants', title: "I'm preparing for the CSE",
    body: 'Build your benchmarking profile once. Every mentor you book sees the same picture of '
        + 'where you stand, so the advice you get never contradicts itself.',
    points: ['Free to register and browse', 'Escrow protects every rupee you spend',
             'Book anonymously when you need to'],
    icon: Icon.Target, swatch: 'from-nex-500 to-nex-700', cta: 'Takes about 2 minutes',
  },
  {
    to: '/join/mentor', tag: 'For mentors', title: 'I want to mentor aspirants',
    body: 'Verify your identity and UPSC record once, switch on the services you want, and set '
        + 'your own price for each. You keep 85% of everything you charge.',
    points: ['You set your own rates and hours', 'Daily workload caps to protect your time',
             'Automatic payouts after each delivery'],
    icon: Icon.Cap, swatch: 'from-gold-400 to-gold-600', cta: 'Verification takes 24–48 hours',
  },
]

export default function Join() {
  const location = useLocation()
  const next = new URLSearchParams(location.search).get('next')
  return (
    <div className="min-h-screen bg-ink-25">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Brand />
          <Link to="/login" className="tap text-[13px] font-bold text-nex-600 hover:text-nex-700">
            Already registered? Sign in
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-16">
        <h1 className="text-center text-[38px] font-extrabold leading-tight tracking-[-0.032em] text-ink-900">
          Which side of the table
          <span className="serif italic font-normal"> are you on?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-center text-[14px] leading-relaxed text-ink-500">
          This decides the workspace you land in. You can always register the other role later
          with a different email address.
        </p>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {CARDS.map(c => (
            <Link key={c.to} to={c.to === '/join/aspirant' && next ? `${c.to}?next=${encodeURIComponent(next)}` : c.to}
              className="surface group relative overflow-hidden p-7 transition duration-200 hover:-translate-y-1 hover:lift">
              <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-10 transition group-hover:opacity-20 ${c.swatch}`} />
              <span className={`grid h-13 w-13 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-sm ${c.swatch}`}
                style={{ width: 52, height: 52 }}>
                <c.icon size={23} />
              </span>
              <p className="mt-6 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-400">{c.tag}</p>
              <h2 className="mt-2 text-[21px] font-extrabold tracking-[-0.025em] text-ink-900">{c.title}</h2>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-500">{c.body}</p>
              <ul className="mt-6 space-y-2.5">
                {c.points.map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-[12.5px] font-semibold text-ink-700">
                    <Icon.Check size={15} className="mt-0.5 shrink-0 text-mint-600" />{p}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex items-center justify-between border-t border-ink-100 pt-4">
                <span className="text-[11.5px] font-semibold text-ink-400">{c.cta}</span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-nex-600">
                  Continue <Icon.Chevron size={15} className="transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
