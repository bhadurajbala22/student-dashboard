import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Brand } from '../components/Brand'
import { Icon } from '../components/icons'
import { OtpField } from '../components/Otp'
import {
  Alert, Button, ChipGroup, Field, Input, Select, Stepper, Textarea, toast,
} from '../components/ui'
import { firstName } from '../format'
import { useCatalog } from '../meta'

const STEPS = ['Your account', 'Benchmarking profile']

export default function JoinAspirant() {
  const { joinStudent } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const cat = useCatalog()
  const next = new URLSearchParams(location.search).get('next')

  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({
    display_name: '', email: '', email_otp: '', mobile: '', mobile_otp: '',
    password: '', city: '',
    target_year: 2027, previous_attempts: 0, optional_subject: '',
    preparation_stages: [], biggest_hurdle: '', graduation: '',
    languages: ['English'], budget_per_session: 600,
  })
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }))
  const onIn = (k) => (e) => set(k)(e.target.value)

  const step0 = f.display_name.trim().length > 1 && /\S+@\S+\.\S+/.test(f.email)
    && f.password.length >= 6

  const submit = async () => {
    setBusy(true); setError('')
    try {
      const data = await joinStudent({
        ...f,
        target_year: Number(f.target_year),
        previous_attempts: Number(f.previous_attempts),
        budget_per_session: Number(f.budget_per_session),
      })
      toast.success(`You're in — welcome, ${firstName(data.user.name)}`)
      nav(next && next.startsWith('/') ? next : '/app', { replace: true })
    } catch (err) { setError(err.message); setStep(0) } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-ink-25">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Brand />
          <Link to="/login" className="tap text-[13px] font-bold text-nex-600">Sign in instead</Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-12">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-nex-600">
          Aspirant registration
        </p>
        <h1 className="mt-2.5 text-[32px] font-extrabold leading-tight tracking-[-0.03em] text-ink-900">
          Find your guide. Streamline your preparation.
        </h1>
        {next && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-mint-50 px-4 py-3 text-[12.5px] leading-relaxed text-mint-700">
            <Icon.Check size={15} className="mt-px shrink-0" />
            <span>
              Almost there — we'll take you straight back to the mentor you were booking once
              this is done.
            </span>
          </p>
        )}

        <div className="mt-7 flex items-center gap-3">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2.5">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] font-extrabold transition ${i < step ? 'bg-mint-600 text-white' : i === step ? 'bg-nex-600 text-white' : 'bg-ink-200 text-ink-500'}`}>
                {i < step ? <Icon.Check size={14} /> : i + 1}
              </span>
              <span className={`whitespace-nowrap text-[12.5px] font-bold ${i === step ? 'text-ink-900' : 'text-ink-400'}`}>{s}</span>
              {i < STEPS.length - 1 && <span className="h-px flex-1 bg-ink-200" />}
            </div>
          ))}
        </div>

        <div className="surface mt-6 p-6">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" required className="sm:col-span-2">
                <Input placeholder="Riya Sharma" value={f.display_name}
                  onChange={onIn('display_name')} autoFocus />
              </Field>
              <Field label="Email address" required hint="This is your login ID.">
                <Input type="email" placeholder="you@example.com" value={f.email} onChange={onIn('email')} />
              </Field>
              <OtpField channel="email" target={f.email} value={f.email_otp}
                onChange={set('email_otp')} label="Verify email"
                hint="Optional for the demo — skip it and you can still register." />
              <Field label="Mobile number" hint="Used for class reminders.">
                <Input placeholder="+91 98765 43210" value={f.mobile} onChange={onIn('mobile')} />
              </Field>
              <OtpField channel="sms" target={f.mobile} value={f.mobile_otp}
                onChange={set('mobile_otp')} label="Verify mobile" />
              <Field label="Password" required hint="At least 6 characters.">
                <Input type="password" placeholder="••••••••" value={f.password} onChange={onIn('password')} />
              </Field>
              <Field label="City">
                <Input placeholder="Delhi" value={f.city} onChange={onIn('city')} />
              </Field>
              {error && <div className="sm:col-span-2"><Alert tone="rose" icon={<Icon.Alert size={15} />}>{error}</Alert></div>}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Alert tone="nex" icon={<Icon.Shield size={16} />} title="Why we ask for this">
                Every mentor you book sees this profile before they accept. It is what stops four
                different people giving you four contradictory plans.
              </Alert>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Target year">
                  <Select value={f.target_year} onChange={onIn('target_year')}
                    options={[2026, 2027, 2028, 2029, 2030].map(y => ({ value: y, label: String(y) }))} />
                </Field>
                <Field label="Previous attempts">
                  <Select value={f.previous_attempts} onChange={onIn('previous_attempts')}
                    options={[0, 1, 2, 3, 4, 5].map(n => ({ value: n, label: n === 0 ? 'None — first attempt' : `${n}` }))} />
                </Field>
                <Field label="Optional subject" hint="Leave blank if undecided.">
                  <Select value={f.optional_subject} onChange={onIn('optional_subject')}
                    placeholder="Not decided yet" options={cat.optional_subjects} />
                </Field>
                <Field label="Graduation" className="sm:col-span-2">
                  <Input placeholder="B.A. Economics, Miranda House" value={f.graduation}
                    onChange={onIn('graduation')} />
                </Field>
                <Field label="Languages">
                  <Select value={f.languages[0] || 'English'}
                    onChange={e => set('languages')([e.target.value])} options={cat.languages} />
                </Field>
              </div>

              <Field label="Current preparation stage" hint="Select everything that applies.">
                <ChipGroup options={cat.preparation_stages} value={f.preparation_stages}
                  onChange={set('preparation_stages')} />
              </Field>

              <Field label="What is your biggest hurdle right now?" required
                hint="Be specific — this is the single thing mentors read before accepting."
                counter={`${f.biggest_hurdle.length} / 800`}>
                <Textarea rows={4} maxLength={800} value={f.biggest_hurdle}
                  onChange={onIn('biggest_hurdle')}
                  placeholder="Cleared Prelims 2026 but missed Mains by 24 marks. My GS-II answers score 6 out of 15 even when I know the content — the structure falls apart under time pressure." />
              </Field>

              <Field label={`Comfortable spend per session — ₹${Number(f.budget_per_session).toLocaleString('en-IN')}`}
                hint="Only used to sort mentors for you. It never hides anyone.">
                <input type="range" min="100" max="3000" step="50" value={f.budget_per_session}
                  onChange={onIn('budget_per_session')} className="mt-3 w-full" />
                <div className="mt-1.5 flex justify-between text-[11px] font-bold text-ink-400 tnum">
                  <span>₹100</span><span>₹3,000+</span>
                </div>
              </Field>

              {error && <Alert tone="rose" icon={<Icon.Alert size={15} />}>{error}</Alert>}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          {step > 0
            ? <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            : <Link to={next ? next : '/join'}
                className="text-[13px] font-bold text-ink-500 hover:text-ink-800">
                {next ? '← Back to browsing' : '← Change role'}
              </Link>}
          {step === 0
            ? <Button size="lg" disabled={!step0} onClick={() => setStep(1)}
                iconRight={<Icon.Chevron size={16} />}>Continue</Button>
            : <Button size="lg" loading={busy} onClick={submit} icon={<Icon.Check size={16} />}>
                Enter the marketplace
              </Button>}
        </div>
      </div>
    </div>
  )
}
