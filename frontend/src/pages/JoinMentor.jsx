import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth'
import { Brand } from '../components/Brand'
import { Icon } from '../components/icons'
import { OtpField } from '../components/Otp'
import { Alert, Button, Field, Input, toast } from '../components/ui'

const PROMISES = [
  ['You set every price', 'Switch on the services you want and name your own rate for each.'],
  ['You own your calendar', 'Publish weekly windows, cap your daily copy load, block out dates.'],
  ['You keep 85%', 'A flat 15% take-rate is the only fee. No listing charges, no subscription.'],
  ['Paid automatically', '72 hours after delivery, straight to the bank account you verify.'],
]

export default function JoinMentor() {
  const { joinMentor } = useAuth()
  const nav = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({
    legal_name: '', display_name: '', email: '', email_otp: '',
    mobile: '', mobile_otp: '', password: '', confirm: '', accepted_terms: false,
  })
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }))
  const onIn = (k) => (e) => set(k)(e.target.value)

  const valid = f.legal_name.trim().length > 1 && f.display_name.trim().length > 1
    && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 6
    && f.password === f.confirm && f.accepted_terms

  const submit = async (e) => {
    e?.preventDefault()
    setBusy(true); setError('')
    try {
      await joinMentor({
        legal_name: f.legal_name, display_name: f.display_name, email: f.email,
        email_otp: f.email_otp, mobile: f.mobile, mobile_otp: f.mobile_otp,
        password: f.password, accepted_terms: f.accepted_terms,
      })
      toast.success('Account created — let\'s build your storefront')
      nav('/app/setup', { replace: true })
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_.85fr]">
      <div className="flex flex-col px-5 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Brand />
          <Link to="/login" className="tap text-[13px] font-bold text-nex-600">Sign in</Link>
        </div>

        <div className="mx-auto w-full max-w-md flex-1 py-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-nex-600">
            Step 1 of 7 · Account
          </p>
          <h1 className="mt-2.5 text-[31px] font-extrabold leading-tight tracking-[-0.03em] text-ink-900">
            Empower the next generation of civil servants.
          </h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-500">
            Create your account first. Identity verification, pricing, subjects and availability
            come next — you can save and step away at any point.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label="Full legal name" required
              hint="Must match your government ID exactly. Never shown to students.">
              <Input placeholder="Ankit Sharma" value={f.legal_name} onChange={onIn('legal_name')} autoFocus />
            </Field>
            <Field label="Display name" required
              hint='How students will see you — e.g. "Ankit S." or "Faculty Ankit".'>
              <Input placeholder="Ankit S." value={f.display_name} onChange={onIn('display_name')} />
            </Field>
            <Field label="Email address" required>
              <Input type="email" placeholder="you@example.com" value={f.email} onChange={onIn('email')} />
            </Field>
            <OtpField channel="email" target={f.email} value={f.email_otp}
              onChange={set('email_otp')} label="Verify email"
              hint="Optional in this demo build." />
            <Field label="Mobile number" required>
              <Input placeholder="+91 98765 43210" value={f.mobile} onChange={onIn('mobile')} />
            </Field>
            <OtpField channel="sms" target={f.mobile} value={f.mobile_otp}
              onChange={set('mobile_otp')} label="Verify mobile" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Create password" required hint="At least 6 characters.">
                <Input type="password" value={f.password} onChange={onIn('password')} />
              </Field>
              <Field label="Confirm password" required
                error={f.confirm && f.confirm !== f.password ? 'Passwords do not match' : undefined}>
                <Input type="password" value={f.confirm} onChange={onIn('confirm')} />
              </Field>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-ink-50 px-4 py-3.5">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={f.accepted_terms}
                onChange={e => set('accepted_terms')(e.target.checked)} />
              <span className="text-[12.5px] leading-relaxed text-ink-700">
                I agree to the <span className="font-bold text-nex-600">Terms of Service</span> and{' '}
                <span className="font-bold text-nex-600">Privacy Policy</span>, and confirm that the
                credentials I am about to submit are my own.
              </span>
            </label>

            {error && <Alert tone="rose" icon={<Icon.Alert size={15} />}>{error}</Alert>}

            <Button type="submit" size="lg" loading={busy} disabled={!valid} className="w-full"
              iconRight={<Icon.Chevron size={16} />}>
              Create account & continue
            </Button>
            <Link to="/join" className="block text-center text-[12.5px] font-bold text-ink-500 hover:text-ink-800">
              ← I'm an aspirant, not a mentor
            </Link>
          </form>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-nex-800 p-10 lg:block">
        <div className="hatch pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(32rem 20rem at 80% 0%, rgb(255 195 0 / .2), transparent 62%)' }} />
        <div className="dotgrid pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative flex h-full flex-col justify-center">
          <h2 className="text-[27px] font-extrabold leading-tight tracking-[-0.025em] text-white">
            An independent practice,
            <span className="serif italic font-normal text-gold-400"> not a job.</span>
          </h2>
          <div className="mt-8 space-y-4">
            {PROMISES.map(([t, b], i) => (
              <div key={t} className="flex gap-3.5">
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/15 text-[11px] font-extrabold text-white tnum">
                  0{i + 1}
                </span>
                <div>
                  <p className="text-[13.5px] font-extrabold text-white">{t}</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/70">{b}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-9 rounded-2xl border border-white/15 bg-white/[.08] p-5">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-white/65">
              What we verify manually
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {['Aadhaar', 'PAN', 'Bank proof', 'Mains marksheet', 'Interview admit card'].map(t => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
                  <Icon.Shield size={11} />{t}
                </span>
              ))}
            </div>
            <p className="mt-3.5 text-[11.5px] leading-relaxed text-white/70">
              Any claim on your public profile has to be backed by a document. That is the whole
              reason a student trusts a stranger with their attempt.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
