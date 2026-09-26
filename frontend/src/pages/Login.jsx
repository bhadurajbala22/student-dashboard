import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Brand } from '../components/Brand'
import { CATEGORY_META } from '../components/domain'
import { Icon } from '../components/icons'
import { Alert, Button, Field, Input, toast } from '../components/ui'
import { firstName } from '../format'

const DEMOS = [
  { group: 'Aspirants', rows: [
    { email: 'riya@student.in', name: 'Riya Sharma',
      hint: 'Answer-writing phase · live retainer, a copy awaiting approval, an anonymous booking' },
    { email: 'karan@student.in', name: 'Karan Verma',
      hint: 'First attempt, works full time · an open dispute and an SLA refund to look at' },
  ]},
  { group: 'Mentors', rows: [
    { email: 'ananya@nexus.in', name: 'Dr. Ananya R.', tag: 'faculty',
      hint: 'Premium Faculty · all four services on, 2 pending requests, escrow balance' },
    { email: 'aarav@nexus.in', name: 'Aarav Menon (AIR 42)', tag: 'ranker',
      hint: 'Recent Ranker · 24-hour SLA copy checking, pre-LBSNAA window' },
    { email: 'sneha@nexus.in', name: 'Sneha Deshpande', tag: 'veteran',
      hint: 'Veteran Aspirant · high-volume copy queue, retainer subscriber' },
  ]},
]

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e?.preventDefault()
    setBusy(true); setError('')
    try {
      const data = await login(form.email.trim(), form.password)
      toast.success(`Welcome back, ${firstName(data.user.name)}`)
      const next = new URLSearchParams(location.search).get('next')
      nav(next && next.startsWith('/') ? next : (location.state?.from || '/app'),
          { replace: true })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col px-5 py-8 sm:px-12">
        <Brand />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.03em] text-ink-900">
            Welcome back
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-500">
            Sign in to your aspirant workspace or mentor dashboard.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Email address" required>
              <Input type="email" required autoFocus autoComplete="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Password" required>
              <Input type="password" required autoComplete="current-password" placeholder="••••••••"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </Field>
            {error && <Alert tone="rose" icon={<Icon.Alert size={15} />}>{error}</Alert>}
            <Button type="submit" size="lg" loading={busy} className="w-full">Sign in</Button>
          </form>

          <p className="mt-7 text-center text-[13px] text-ink-500">
            New here?{' '}
            <Link to={`/join${location.search}`} className="tap font-bold text-nex-600 hover:text-nex-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-nex-800 p-10 lg:block">
        <div className="hatch pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(34rem 20rem at 85% 0%, rgb(255 195 0 / .2), transparent 62%)' }} />
        <div className="dotgrid pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative flex h-full flex-col justify-center">
          <h2 className="text-[26px] font-extrabold leading-tight tracking-[-0.025em] text-white">
            Seeded accounts to explore
          </h2>
          <p className="mt-2.5 max-w-sm text-[12.5px] leading-relaxed text-white/75">
            The marketplace ships with 14 verified mentors and 3 aspirants, plus live orders across
            all four services — escrow holds, an SLA refund, a frozen dispute and an anonymous
            booking. Password for every account is{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12px] font-bold text-white">demo1234</code>.
          </p>

          <div className="mt-7 space-y-5">
            {DEMOS.map(section => (
              <div key={section.group}>
                <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/65">
                  {section.group}
                </p>
                <div className="space-y-2">
                  {section.rows.map(d => {
                    const cat = d.tag ? CATEGORY_META[d.tag] : null
                    return (
                      <button key={d.email} onClick={() => setForm({ email: d.email, password: 'demo1234' })}
                        className="group flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/[.08] p-3.5 text-left transition hover:border-white/40 hover:bg-white/[.14]">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
                          {cat ? <cat.icon size={16} /> : <Icon.User size={16} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[12.5px] font-extrabold text-white">{d.name}</span>
                          <span className="block truncate text-[11px] text-white/65">{d.hint}</span>
                        </span>
                        <Icon.Chevron size={14} className="shrink-0 text-white/60 transition group-hover:translate-x-0.5 group-hover:text-white" />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[11px] text-white/60">Tap a card to fill the form, then Sign in.</p>
        </div>
      </div>
    </div>
  )
}
