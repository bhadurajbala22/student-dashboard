import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Brand } from '../components/Brand'
import { CATEGORY_META, SERVICE_ICON } from '../components/domain'
import { Icon } from '../components/icons'
import WeekPlanner, { cellsToSlots, slotsToCells } from '../components/WeekPlanner'
import {
  Alert, Avatar, Badge, Button, Card, ChipGroup, Field, Input, Ring, Segmented, Select,
  Stars, Textarea, Toggle, toast,
} from '../components/ui'
import { inr } from '../format'
import { useCatalog } from '../meta'

const STEPS = [
  { key: 'kyc', label: 'Identity & payouts', icon: Icon.Id, screen: 2 },
  { key: 'credentials', label: 'UPSC credentials', icon: Icon.Cap, screen: 3 },
  { key: 'services', label: 'Storefront & pricing', icon: Icon.Wallet, screen: 4 },
  { key: 'expertise', label: 'Subject expertise', icon: Icon.Book, screen: 5 },
  { key: 'schedule', label: 'Calendar & workload', icon: Icon.Calendar, screen: 6 },
  { key: 'review', label: 'Review & agreements', icon: Icon.Scale, screen: 7 },
]

const num = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v))

/* ─────────────────────────────────────────────── file drop control */
function FileDrop({ label, hint, onPick, done, accept = 'image/*,.pdf' }) {
  const ref = useRef(null)
  const [name, setName] = useState('')
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-bold text-ink-700">{label}</p>
      <button type="button" onClick={() => ref.current?.click()}
        className={`focusable flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-left transition ${done || name
          ? 'border-mint-300 bg-mint-50' : 'border-ink-300 hover:border-nex-400 hover:bg-nex-50/40'}`}>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${done || name ? 'bg-mint-100 text-mint-600' : 'bg-ink-100 text-ink-500'}`}>
          {done || name ? <Icon.Check size={16} /> : <Icon.Upload size={16} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-bold text-ink-800">
            {name || (done ? 'Uploaded' : 'Choose a file')}
          </span>
          <span className="block text-[11px] text-ink-500">{hint || 'JPG, PNG or PDF · max 5 MB'}</span>
        </span>
      </button>
      <input ref={ref} type="file" className="hidden" accept={accept}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) { setName(f.name); onPick(f) }
        }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════ page */
export default function Onboarding() {
  const { user, profile, setProfile, logout, refresh } = useAuth()
  const nav = useNavigate()
  const cat = useCatalog()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)

  const status = profile?.verification_status
  const submitted = status === 'submitted' || status === 'in_review'

  useEffect(() => {
    if (status === 'verified') nav('/app', { replace: true })
  }, [status, nav])

  // jump the user to their first unfinished step on load
  const bootRef = useRef(false)
  useEffect(() => {
    if (bootRef.current || !profile?.onboarding) return
    bootRef.current = true
    const steps = profile.onboarding.steps
    const first = STEPS.findIndex(s => !steps[s.key])
    setStep(first === -1 ? STEPS.length - 1 : first)
  }, [profile])

  /* ---------------------------------------------------- local state */
  const [kyc, setKyc] = useState({
    aadhaar_number: '', pan_number: '', bank_holder: profile?.bank_holder || '',
    bank_account: '', bank_account_confirm: '', bank_ifsc: profile?.bank_ifsc || '',
    bank_type: profile?.bank_type || 'Savings',
  })
  const [kycFiles, setKycFiles] = useState({})

  const [cr, setCr] = useState(() => ({
    category: profile?.category || 'veteran',
    headline: profile?.headline || '',
    philosophy: profile?.philosophy || '',
    employment_status: profile?.employment_status || '',
    languages: profile?.languages?.length ? profile.languages : ['English'],
    total_attempts: profile?.total_attempts ?? 0,
    prelims_cleared_years: profile?.prelims_cleared_years || [],
    mains_cleared_years: profile?.mains_cleared_years || [],
    interview_years: profile?.interview_years || [],
    has_final_rank: profile?.has_final_rank || false,
    final_rank: profile?.final_rank || '',
    service_allocated: profile?.service_allocated || '',
    batch_year: profile?.batch_year || '',
    highest_qualification: profile?.highest_qualification || '',
    university: profile?.university || '',
    other_credentials: profile?.other_credentials || '',
    teaching_years: profile?.teaching_years ?? 0,
    online_teaching_years: profile?.online_teaching_years ?? 0,
    students_mentored: profile?.students_mentored ?? 0,
    selections_produced: profile?.selections_produced ?? 0,
  }))

  const [services, setServices] = useState(() => {
    const byKind = Object.fromEntries((profile?.services || []).map(s => [s.kind, s]))
    return ['video_1on1', 'offline_eval', 'live_eval', 'retainer'].map(kind => ({
      kind,
      is_active: byKind[kind]?.is_active || false,
      price: byKind[kind]?.price || 0,
      session_tags: byKind[kind]?.session_tags || [],
      sla_hours: byKind[kind]?.sla_hours || 48,
      package_title: byKind[kind]?.package_title || '',
      deliverables: byKind[kind]?.deliverables || '',
      session_credits: byKind[kind]?.session_credits || 4,
      eval_credits: byKind[kind]?.eval_credits || 20,
      validity_days: byKind[kind]?.validity_days || 30,
    }))
  })
  const [serviceTab, setServiceTab] = useState('video_1on1')
  const [guide, setGuide] = useState(null)

  const [expertise, setExpertise] = useState(profile?.expertise || {})
  const [optionals, setOptionals] = useState(profile?.optional_subjects || [])

  const [cells, setCells] = useState(() => slotsToCells(profile?.availability || []))
  const [maxCopies, setMaxCopies] = useState(profile?.max_daily_copies ?? 5)
  const [blackout, setBlackout] = useState({ date: '', reason: '' })

  const [agree, setAgree] = useState({ escrow: false, sla: false, nda: false, commission: false })

  /* -------------------------------------------------- rate guidance */
  useEffect(() => {
    const id = setTimeout(() => {
      api.post('/rate-guidance', { ...cr, expertise, optional_subjects: optionals })
        .then(setGuide).catch(() => {})
    }, 260)
    return () => clearTimeout(id)
  }, [cr, expertise, optionals])

  const svc = (kind) => services.find(s => s.kind === kind)
  const setSvc = (kind, patch) =>
    setServices(prev => prev.map(s => (s.kind === kind ? { ...s, ...patch } : s)))

  /* ------------------------------------------------------- savers */
  const save = async (which) => {
    setBusy(true)
    try {
      let updated
      if (which === 'kyc') {
        const fd = new FormData()
        Object.entries(kyc).forEach(([k, v]) => fd.append(k, v))
        Object.entries(kycFiles).forEach(([k, f]) => f && fd.append(k, f))
        updated = await api.upload('/mentors/me/kyc', fd)
      } else if (which === 'credentials') {
        updated = await api.put('/mentors/me/credentials', {
          ...cr,
          final_rank: cr.has_final_rank ? num(cr.final_rank) : null,
          batch_year: cr.batch_year ? num(cr.batch_year) : null,
          total_attempts: num(cr.total_attempts),
          teaching_years: num(cr.teaching_years),
          online_teaching_years: num(cr.online_teaching_years),
          students_mentored: num(cr.students_mentored),
          selections_produced: num(cr.selections_produced),
        })
      } else if (which === 'services') {
        updated = await api.put('/mentors/me/services', {
          services: services.map(s => ({ ...s, price: num(s.price) })),
        })
      } else if (which === 'expertise') {
        updated = await api.put('/mentors/me/expertise', {
          expertise, optional_subjects: optionals,
        })
      } else if (which === 'schedule') {
        updated = await api.put('/mentors/me/schedule', {
          slots: cellsToSlots(cells), max_daily_copies: num(maxCopies),
        })
      }
      setProfile(updated)
      toast.success('Saved')
      setStep(s => Math.min(s + 1, STEPS.length - 1))
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const uploadProof = async (kind, file) => {
    const fd = new FormData()
    fd.append('kind', kind)
    fd.append('file', file)
    try {
      setProfile(await api.upload('/mentors/me/proof', fd))
      toast.success('Uploaded')
    } catch (e) { toast.error(e.message) }
  }

  const addBlackout = async () => {
    if (!blackout.date) return toast.error('Pick a date')
    try {
      setProfile(await api.post('/mentors/me/blackouts', blackout))
      setBlackout({ date: '', reason: '' })
    } catch (e) { toast.error(e.message) }
  }

  const submitForReview = async () => {
    setBusy(true)
    try {
      setProfile(await api.post('/mentors/me/submit', {
        agreed_escrow: agree.escrow, agreed_sla: agree.sla,
        agreed_nda: agree.nda, agreed_commission: agree.commission,
      }))
      toast.success('Submitted for verification')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const simulate = async () => {
    setBusy(true)
    try {
      setProfile(await api.post('/mentors/me/simulate-review'))
      toast.success('Verified — your storefront is live')
      await refresh()
      nav('/app', { replace: true })
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const done = profile?.onboarding?.steps || {}
  const activeServices = services.filter(s => s.is_active && num(s.price) > 0)
  const expertiseCount = Object.values(expertise).reduce((n, v) => n + (v?.length || 0), 0)
  const allAgreed = Object.values(agree).every(Boolean)

  /* ═══════════════════════════════════════════ screen 8: pending */
  if (submitted) {
    const tracker = [
      ['Details submitted', 'done'],
      ['Admin document verification', 'active'],
      ['Profile live', 'todo'],
    ]
    return (
      <div className="min-h-screen bg-ink-25">
        <header className="border-b border-ink-200 bg-white">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
            <Brand to={null} />
            <Button variant="ghost" size="sm" onClick={() => { logout(); nav('/') }}
              icon={<Icon.Logout size={14} />}>Sign out</Button>
          </div>
        </header>
        <div className="mx-auto max-w-2xl px-5 py-16">
          <div className="surface p-8 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-50 text-gold-600">
              <Icon.Clock size={26} />
            </span>
            <h1 className="mt-5 text-[26px] font-extrabold tracking-[-0.025em] text-ink-900">
              Your profile is under review
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-500">
              Our team is manually verifying your government IDs and UPSC marksheets. This
              normally takes 24 to 48 hours, and you'll get an email the moment it clears.
            </p>

            <div className="mt-9 space-y-3 text-left">
              {tracker.map(([label, state], i) => (
                <div key={label} className={`flex items-center gap-3.5 rounded-2xl px-4 py-3.5 ${state === 'done' ? 'bg-mint-50' : state === 'active' ? 'bg-nex-50' : 'bg-ink-50'}`}>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-extrabold ${state === 'done' ? 'bg-mint-600 text-white' : state === 'active' ? 'bg-nex-600 text-white' : 'bg-ink-200 text-ink-500'}`}>
                    {state === 'done' ? <Icon.Check size={15} /> : state === 'active' ? <Icon.Refresh size={15} className="animate-spin" style={{ animationDuration: '2.6s' }} /> : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13.5px] font-extrabold ${state === 'todo' ? 'text-ink-500' : 'text-ink-900'}`}>{label}</p>
                    <p className="text-[11.5px] text-ink-500">
                      {state === 'done' ? 'Received — thank you'
                        : state === 'active' ? 'In progress · 24–48 hours'
                          : 'Discoverable by aspirants once verified'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-dashed border-ink-300 bg-white p-5 text-left">
              <p className="flex items-center gap-2 text-[12.5px] font-extrabold text-ink-800">
                <Icon.Info size={15} className="text-nex-600" /> Demo shortcut
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">
                There's no second admin login in this build, so this button stands in for the
                manual verification queue and approves you instantly.
              </p>
              <Button className="mt-4" loading={busy} onClick={simulate}
                icon={<Icon.Shield size={15} />}>Approve me & go live</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ══════════════════════════════════════════ screens 2–7: wizard */
  const S = STEPS[step]

  return (
    <div className="min-h-screen bg-ink-25">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
          <Brand to={null} />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <Ring percent={profile?.onboarding?.percent || 0} size={34} stroke={3.5} />
              <span className="text-[12px] font-bold text-ink-600">
                {profile?.onboarding?.done || 0} of {profile?.onboarding?.total || 7} done
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => { logout(); nav('/') }}
              icon={<Icon.Logout size={14} />}>Sign out</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-7 px-5 py-9 lg:grid-cols-[236px_1fr]">
        {/* ─────────────────────────────────── progress rail */}
        <aside>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.15em] text-gold-600">
            Mentor setup
          </p>
          <h2 className="mt-1.5 text-[17px] font-extrabold tracking-[-0.02em] text-ink-900">
            Build your storefront
          </h2>
          <ol className="mt-5 space-y-1">
            {STEPS.map((s, i) => {
              const complete = done[s.key]
              const active = i === step
              return (
                <li key={s.key}>
                  <button onClick={() => setStep(i)}
                    className={`focusable flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-bold transition ${active ? 'bg-white text-ink-900 ring-1 ring-ink-200 lift' : complete ? 'text-mint-700 hover:bg-white/70' : 'text-ink-500 hover:bg-white/70'}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10.5px] font-extrabold ${complete ? 'bg-mint-600 text-white' : active ? 'bg-nex-600 text-white' : 'bg-ink-200 text-ink-500'}`}>
                      {complete ? <Icon.Check size={12} /> : s.screen}
                    </span>
                    <span className="min-w-0 truncate">{s.label}</span>
                  </button>
                </li>
              )
            })}
          </ol>

          {guide && step === 2 && (
            <Card className="mt-5 hidden lg:block" pad="p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                Suggested anchor
              </p>
              <p className="mt-1.5 text-[22px] font-extrabold leading-none text-ink-900 tnum">
                {inr(guide.rates.video_1on1)}
              </p>
              <p className="mt-1 text-[11px] text-ink-500">per 30-minute call</p>
              <p className="mt-2.5 text-[10.5px] leading-snug text-ink-400">
                Computed from your credentials. You decide the real number.
              </p>
            </Card>
          )}
        </aside>

        {/* ─────────────────────────────────────── step body */}
        <div>
          <Card className="overflow-visible">
            <div className="mb-5 flex items-start gap-3 border-b border-ink-200 pb-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-nex-50 text-nex-600">
                <S.icon size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                  Screen {S.screen}
                </p>
                <h1 className="text-[17px] font-extrabold tracking-[-0.02em] text-ink-900">{S.label}</h1>
              </div>
            </div>

            {/* ───────────────────────── 2. KYC */}
            {S.key === 'kyc' && (
              <div className="space-y-6">
                <Alert tone="nex" icon={<Icon.Lock size={16} />} title="Trust & safety">
                  We store only a masked version of these numbers — the full Aadhaar and account
                  number never touch the database. Documents go to a private folder that only the
                  verification team can open.
                </Alert>

                <div>
                  <p className="mb-3 flex items-center gap-2 text-[12.5px] font-extrabold text-ink-800">
                    <Icon.Id size={15} className="text-ink-400" /> Government ID
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Aadhaar number" required hint="12 digits — stored masked.">
                      <Input inputMode="numeric" maxLength={14} placeholder="1234 5678 9012"
                        value={kyc.aadhaar_number} className="tnum"
                        onChange={e => setKyc(k => ({ ...k, aadhaar_number: e.target.value }))} />
                    </Field>
                    <Field label="PAN number" required hint="10 characters — stored masked.">
                      <Input maxLength={10} placeholder="ABCDE1234F"
                        value={kyc.pan_number} className="uppercase"
                        onChange={e => setKyc(k => ({ ...k, pan_number: e.target.value.toUpperCase() }))} />
                    </Field>
                    <FileDrop label="Aadhaar — front" done={profile?.kyc_docs?.aadhaar_front}
                      onPick={f => setKycFiles(s => ({ ...s, aadhaar_front: f }))} />
                    <FileDrop label="Aadhaar — back" done={profile?.kyc_docs?.aadhaar_back}
                      onPick={f => setKycFiles(s => ({ ...s, aadhaar_back: f }))} />
                    <FileDrop label="PAN card" done={profile?.kyc_docs?.pan_doc}
                      onPick={f => setKycFiles(s => ({ ...s, pan_doc: f }))} />
                  </div>
                </div>

                <div className="border-t border-ink-200 pt-6">
                  <p className="mb-3 flex items-center gap-2 text-[12.5px] font-extrabold text-ink-800">
                    <Icon.Bank size={15} className="text-ink-400" /> Payout account · escrow settlement
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Account holder name" required className="sm:col-span-2">
                      <Input placeholder="As printed in the passbook" value={kyc.bank_holder}
                        onChange={e => setKyc(k => ({ ...k, bank_holder: e.target.value }))} />
                    </Field>
                    <Field label="Bank account number" required>
                      <Input inputMode="numeric" value={kyc.bank_account} className="tnum"
                        onChange={e => setKyc(k => ({ ...k, bank_account: e.target.value }))} />
                    </Field>
                    <Field label="Re-enter account number" required
                      error={kyc.bank_account_confirm && kyc.bank_account_confirm !== kyc.bank_account
                        ? 'Numbers do not match' : undefined}>
                      <Input inputMode="numeric" value={kyc.bank_account_confirm} className="tnum"
                        onChange={e => setKyc(k => ({ ...k, bank_account_confirm: e.target.value }))} />
                    </Field>
                    <Field label="IFSC code" required>
                      <Input maxLength={11} placeholder="HDFC0001234" className="uppercase"
                        value={kyc.bank_ifsc}
                        onChange={e => setKyc(k => ({ ...k, bank_ifsc: e.target.value.toUpperCase() }))} />
                    </Field>
                    <Field label="Account type">
                      <Select value={kyc.bank_type} options={['Savings', 'Current']}
                        onChange={e => setKyc(k => ({ ...k, bank_type: e.target.value }))} />
                    </Field>
                    <div className="sm:col-span-2">
                      <FileDrop label="Cancelled cheque or passbook front page"
                        hint="Required for automated payouts · JPG, PNG or PDF"
                        done={profile?.kyc_docs?.bank_proof}
                        onPick={f => setKycFiles(s => ({ ...s, bank_proof: f }))} />
                    </div>
                  </div>
                  {profile?.bank_account_masked && (
                    <p className="mt-3 flex items-center gap-2 text-[11.5px] font-semibold text-mint-700">
                      <Icon.Check size={13} /> On file: {profile.bank_account_masked} · {profile.bank_ifsc}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ───────────────────────── 3. credentials */}
            {S.key === 'credentials' && (
              <div className="space-y-6">
                <Alert tone="gold" icon={<Icon.Target size={16} />} title="Prove your pedigree">
                  Students filter on these exact metrics, so anything you claim here has to be
                  backed by the document we ask for. Unverifiable claims get the profile rejected.
                </Alert>

                <Field label="Which kind of mentor are you?" required>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {Object.entries(CATEGORY_META).map(([key, meta]) => {
                      const on = cr.category === key
                      return (
                        <button key={key} type="button" onClick={() => setCr(c => ({ ...c, category: key }))}
                          className={`focusable rounded-2xl border p-3.5 text-left transition ${on ? 'border-nex-500 bg-nex-50 ring-1 ring-nex-500' : 'border-ink-200 hover:border-nex-300 hover:bg-nex-50/40'}`}>
                          <meta.icon size={18} className={on ? 'text-nex-600' : 'text-ink-400'} />
                          <p className="mt-2 text-[12.5px] font-extrabold text-ink-900">{meta.label}</p>
                          <p className="mt-0.5 text-[10.5px] leading-snug text-ink-500">
                            {key === 'faculty' ? 'Subject specialist, classroom background'
                              : key === 'ranker' ? 'Selected candidate, pre-LBSNAA'
                                : 'Interview / Mains cleared aspirant'}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </Field>

                <div>
                  <p className="mb-3 text-[12.5px] font-extrabold text-ink-800">Your UPSC journey</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Total attempts given">
                      <Input type="number" min="0" max="10" value={cr.total_attempts}
                        onChange={e => setCr(c => ({ ...c, total_attempts: e.target.value }))} />
                    </Field>
                    <Field label="Employment status">
                      <Select value={cr.employment_status} placeholder="Select"
                        options={cat.employment_statuses}
                        onChange={e => setCr(c => ({ ...c, employment_status: e.target.value }))} />
                    </Field>
                  </div>

                  <div className="mt-4 space-y-4">
                    <Field label="Prelims cleared — years" hint="Select every year you qualified.">
                      <ChipGroup small options={cat.exam_years.slice(0, 14).map(String)}
                        value={(cr.prelims_cleared_years || []).map(String)}
                        onChange={v => setCr(c => ({ ...c, prelims_cleared_years: v.map(Number) }))} />
                    </Field>

                    <Field label="Mains cleared — years"
                      hint="Selecting a year makes the marksheet upload mandatory.">
                      <ChipGroup small options={cat.exam_years.slice(0, 14).map(String)}
                        value={(cr.mains_cleared_years || []).map(String)}
                        onChange={v => setCr(c => ({ ...c, mains_cleared_years: v.map(Number) }))} />
                    </Field>
                    {cr.mains_cleared_years?.length > 0 && (
                      <div className="rounded-2xl bg-gold-50 p-4">
                        <FileDrop label="UPSC Mains marksheet (mandatory)"
                          hint="PDF or image of the official marksheet"
                          done={profile?.kyc_docs?.mains_marksheet}
                          onPick={f => uploadProof('mains_marksheet', f)} />
                      </div>
                    )}

                    <Field label="Interviews appeared — years"
                      hint="Selecting a year makes the admit card upload mandatory.">
                      <ChipGroup small options={cat.exam_years.slice(0, 14).map(String)}
                        value={(cr.interview_years || []).map(String)}
                        onChange={v => setCr(c => ({ ...c, interview_years: v.map(Number) }))} />
                    </Field>
                    {cr.interview_years?.length > 0 && (
                      <div className="rounded-2xl bg-gold-50 p-4">
                        <FileDrop label="UPSC interview admit card (mandatory)"
                          done={profile?.kyc_docs?.interview_admit_card}
                          onPick={f => uploadProof('interview_admit_card', f)} />
                      </div>
                    )}

                    <div className="rounded-2xl bg-ink-50 p-4">
                      <Toggle checked={cr.has_final_rank}
                        onChange={v => setCr(c => ({ ...c, has_final_rank: v }))}
                        label="I secured a final rank"
                        hint="Shows an AIR badge on your card — the single strongest signal on the platform." />
                      {cr.has_final_rank && (
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <Field label="Rank achieved">
                            <Input type="number" min="1" placeholder="42" value={cr.final_rank}
                              onChange={e => setCr(c => ({ ...c, final_rank: e.target.value }))} />
                          </Field>
                          <Field label="Service allocated">
                            <Select value={cr.service_allocated} placeholder="Select"
                              options={cat.services_allocated}
                              onChange={e => setCr(c => ({ ...c, service_allocated: e.target.value }))} />
                          </Field>
                          <Field label="Batch year">
                            <Input type="number" placeholder="2026" value={cr.batch_year}
                              onChange={e => setCr(c => ({ ...c, batch_year: e.target.value }))} />
                          </Field>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-ink-200 pt-6">
                  <p className="mb-3 text-[12.5px] font-extrabold text-ink-800">
                    Academic & teaching background
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Highest qualification" required>
                      <Select value={cr.highest_qualification} placeholder="Select"
                        options={cat.qualifications}
                        onChange={e => setCr(c => ({ ...c, highest_qualification: e.target.value }))} />
                    </Field>
                    <Field label="University / institution">
                      <Input value={cr.university}
                        onChange={e => setCr(c => ({ ...c, university: e.target.value }))} />
                    </Field>
                    <Field label="Teaching experience (years)">
                      <Input type="number" step="0.5" min="0" value={cr.teaching_years}
                        onChange={e => setCr(c => ({ ...c, teaching_years: e.target.value }))} />
                    </Field>
                    <Field label="Online / ed-tech experience (years)">
                      <Input type="number" step="0.5" min="0" value={cr.online_teaching_years}
                        onChange={e => setCr(c => ({ ...c, online_teaching_years: e.target.value }))} />
                    </Field>
                    <Field label="Students mentored (lifetime)">
                      <Input type="number" min="0" value={cr.students_mentored}
                        onChange={e => setCr(c => ({ ...c, students_mentored: e.target.value }))} />
                    </Field>
                    <Field label="Students in the final list">
                      <Input type="number" min="0" value={cr.selections_produced}
                        onChange={e => setCr(c => ({ ...c, selections_produced: e.target.value }))} />
                    </Field>
                  </div>
                  <Field className="mt-4" label="Other credentials"
                    hint="NET/JRF, publications, prior institutions, awards.">
                    <Textarea rows={2} value={cr.other_credentials}
                      onChange={e => setCr(c => ({ ...c, other_credentials: e.target.value }))} />
                  </Field>
                </div>

                <div className="border-t border-ink-200 pt-6">
                  <p className="mb-3 text-[12.5px] font-extrabold text-ink-800">Public profile</p>
                  <Field label="Headline" required hint="One line, shown on your card in search."
                    counter={`${cr.headline.length} / 140`}>
                    <Input maxLength={140} value={cr.headline}
                      placeholder="Polity & Governance · 12 years of Prelims-to-Interview mentorship"
                      onChange={e => setCr(c => ({ ...c, headline: e.target.value }))} />
                  </Field>
                  <Field className="mt-4" label="About me / teaching philosophy" required
                    hint="Explain your methodology and how you help students break their plateaus."
                    counter={`${cr.philosophy.trim().split(/\s+/).filter(Boolean).length} / 250 words`}>
                    <Textarea rows={6} value={cr.philosophy}
                      onChange={e => setCr(c => ({ ...c, philosophy: e.target.value }))}
                      placeholder="I teach the Constitution the way the examiner reads it — provision, intent, and the current-affairs hook. Every session ends with one 150-word answer you write in front of me." />
                  </Field>
                  <Field className="mt-4" label="Languages of instruction">
                    <ChipGroup small options={cat.languages.slice(0, 9)} value={cr.languages}
                      onChange={v => setCr(c => ({ ...c, languages: v }))} />
                  </Field>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <FileDrop label="Profile picture" hint="Square crop works best · JPG or PNG"
                      accept="image/*" done={!!user.photo} onPick={f => uploadProof('photo', f)} />
                    <FileDrop label="Intro video pitch"
                      hint="Max 60 seconds · profiles with video get booked ~3x faster"
                      accept="video/*" done={!!profile?.intro_video}
                      onPick={f => uploadProof('intro_video', f)} />
                  </div>
                </div>
              </div>
            )}

            {/* ───────────────────────── 4. services & pricing */}
            {S.key === 'services' && (
              <div className="space-y-5">
                <Alert tone="mint" icon={<Icon.Wallet size={16} />} title="You set every price">
                  Switch on only what you actually want to deliver. The band beside each field is a
                  reference computed from the credentials you just entered — it is never enforced.
                  You keep {Math.round((1 - cat.commission_rate) * 100)}% of whatever you charge.
                </Alert>

                <Segmented full value={serviceTab} onChange={setServiceTab}
                  options={Object.entries(cat.services || {}).map(([k, v]) => ({
                    value: k, label: v.short,
                  }))} />

                {['video_1on1', 'offline_eval', 'live_eval', 'retainer']
                  .filter(k => k === serviceTab).map(kind => {
                    const s = svc(kind)
                    const meta = cat.services?.[kind] || {}
                    const I = SERVICE_ICON[kind]
                    const band = guide?.band?.[kind]
                    const earn = s.price ? Math.round(num(s.price) * (1 - cat.commission_rate)) : 0
                    return (
                      <div key={kind} className="rounded-2xl border border-ink-200 p-5">
                        <div className="flex items-start gap-3.5">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-nex-50 text-nex-600">
                            <I size={20} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15px] font-extrabold text-ink-900">{meta.label}</h3>
                            <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{meta.delivery}</p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-xl bg-ink-50 p-3.5">
                          <Toggle checked={s.is_active} onChange={v => setSvc(kind, { is_active: v })}
                            label={`Offer ${meta.short?.toLowerCase()}`}
                            hint={s.is_active ? 'Visible on your storefront' : 'Hidden from students'} />
                        </div>

                        {s.is_active && (
                          <div className="mt-4 space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                              <Field label={`Your price ${meta.unit}`} required
                                hint={band ? `Reference band ${inr(band.min)}–${inr(band.max)}` : undefined}>
                                <Input type="number" min="10" step="10" prefix="₹" value={s.price}
                                  onChange={e => setSvc(kind, { price: e.target.value })} />
                              </Field>
                              <div className="rounded-xl bg-mint-50 p-3.5">
                                <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-mint-700">
                                  You receive
                                </p>
                                <p className="mt-1 text-[22px] font-extrabold leading-none text-mint-700 tnum">
                                  {inr(earn)}
                                </p>
                                <p className="mt-1 text-[11px] text-mint-600">
                                  after the {Math.round(cat.commission_rate * 100)}% take-rate
                                  {guide?.rates?.[kind] ? ` · suggested ${inr(guide.rates[kind])}` : ''}
                                </p>
                              </div>
                            </div>

                            {kind === 'video_1on1' && (
                              <Field label="Session expertise tags" required
                                hint="What students can book this call for.">
                                <ChipGroup options={cat.session_tags} value={s.session_tags}
                                  onChange={v => setSvc(kind, { session_tags: v })} />
                              </Field>
                            )}

                            {kind === 'offline_eval' && (
                              <Field label="Guaranteed turnaround time (SLA)" required
                                hint="Miss this deadline and the student is refunded automatically. Pick honestly.">
                                <Segmented value={s.sla_hours}
                                  onChange={v => setSvc(kind, { sla_hours: v })}
                                  options={(cat.sla_choices || [24, 48, 72]).map(h => ({
                                    value: h, label: `${h} hours`,
                                  }))} />
                              </Field>
                            )}

                            {kind === 'retainer' && (
                              <div className="space-y-4">
                                <Field label="Package title" required>
                                  <Input placeholder="30-Day Daily Mains Rigor" value={s.package_title}
                                    onChange={e => setSvc(kind, { package_title: e.target.value })} />
                                </Field>
                                <Field label="Deliverables" required
                                  hint="Be concrete. This is the contract the student holds you to.">
                                  <Textarea rows={3} value={s.deliverables}
                                    onChange={e => setSvc(kind, { deliverables: e.target.value })}
                                    placeholder="One question daily, evaluated within 24 hours, plus 4 weekend video calls and chat access." />
                                </Field>
                                <div className="grid gap-4 sm:grid-cols-3">
                                  <Field label="Session credits">
                                    <Input type="number" min="0" value={s.session_credits}
                                      onChange={e => setSvc(kind, { session_credits: num(e.target.value) })} />
                                  </Field>
                                  <Field label="Evaluation credits">
                                    <Input type="number" min="0" value={s.eval_credits}
                                      onChange={e => setSvc(kind, { eval_credits: num(e.target.value) })} />
                                  </Field>
                                  <Field label="Validity (days)">
                                    <Input type="number" min="7" value={s.validity_days}
                                      onChange={e => setSvc(kind, { validity_days: num(e.target.value) })} />
                                  </Field>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                {guide && (
                  <details className="rounded-2xl border border-ink-200 bg-ink-25 p-4">
                    <summary className="cursor-pointer text-[12.5px] font-extrabold text-ink-800">
                      How we computed your reference band
                    </summary>
                    <div className="mt-3 space-y-1.5">
                      {guide.breakdown.map((b, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-3 text-[12px]">
                          <span className="text-ink-600">{b.label}</span>
                          <span className="shrink-0 font-extrabold text-ink-900 tnum">
                            {i === 0 ? '' : '+'}{inr(b.value)}
                          </span>
                        </div>
                      ))}
                      <p className="border-t border-ink-200 pt-2.5 text-[11.5px] text-ink-500">
                        {guide.note}
                      </p>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* ───────────────────────── 5. expertise */}
            {S.key === 'expertise' && (
              <div className="space-y-5">
                <Alert tone="nex" icon={<Icon.Book size={16} />}>
                  Tick only what you would be happy to be examined on. These checkboxes are the
                  filters students use, so over-claiming just earns you bad reviews.
                </Alert>

                {Object.entries(cat.subject_groups || {}).map(([gkey, group]) => (
                  <Field key={gkey} label={group.label}>
                    <ChipGroup options={group.items} value={expertise[gkey] || []}
                      onChange={v => setExpertise(e => ({ ...e, [gkey]: v }))} />
                  </Field>
                ))}

                <Field label="Optional subjects you can teach"
                  hint="Leave empty if you only take General Studies.">
                  <ChipGroup small options={cat.optional_subjects} value={optionals}
                    onChange={setOptionals} />
                </Field>

                <div className="rounded-2xl bg-ink-50 px-4 py-3">
                  <p className="text-[12.5px] font-bold text-ink-700">
                    {expertiseCount} topic{expertiseCount === 1 ? '' : 's'} selected
                    {optionals.length ? ` · ${optionals.length} optional subject${optionals.length === 1 ? '' : 's'}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* ───────────────────────── 6. calendar & workload */}
            {S.key === 'schedule' && (
              <div className="space-y-6">
                <div>
                  <p className="mb-1 text-[12.5px] font-extrabold text-ink-800">
                    Live call availability
                  </p>
                  <p className="mb-3 text-[12px] text-ink-500">
                    Applies to video sessions and live evaluations, and repeats every week. All
                    times IST.
                  </p>
                  <WeekPlanner cells={cells} onChange={setCells} />
                  <p className="mt-2.5 text-[12px] font-bold text-ink-600">
                    {cells.size} hour{cells.size === 1 ? '' : 's'} open per week ·{' '}
                    {cells.size * 2} bookable 30-minute slots
                  </p>
                </div>

                <div className="border-t border-ink-200 pt-6">
                  <p className="mb-3 text-[12.5px] font-extrabold text-ink-800">Blackout dates</p>
                  <div className="flex flex-wrap items-end gap-2.5">
                    <Field label="Date" className="w-40">
                      <Input type="date" value={blackout.date}
                        onChange={e => setBlackout(b => ({ ...b, date: e.target.value }))} />
                    </Field>
                    <Field label="Reason" className="min-w-[180px] flex-1">
                      <Input placeholder="Travelling" value={blackout.reason}
                        onChange={e => setBlackout(b => ({ ...b, reason: e.target.value }))} />
                    </Field>
                    <Button variant="outline" onClick={addBlackout} icon={<Icon.Plus size={15} />}>
                      Block
                    </Button>
                  </div>
                  {profile?.blackouts?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {profile.blackouts.map(b => (
                        <span key={b.date}
                          className="inline-flex items-center gap-2 rounded-full bg-nex-50 px-3 py-1.5 text-[11.5px] font-bold text-nex-700">
                          {b.date}{b.reason ? ` · ${b.reason}` : ''}
                          <button onClick={async () => {
                            setProfile(await api.del(`/mentors/me/blackouts/${b.date}`))
                          }}><Icon.X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-ink-200 pt-6">
                  <p className="mb-3 text-[12.5px] font-extrabold text-ink-800">
                    Offline workload cap
                  </p>
                  <Field label={`Maximum answers per day — ${maxCopies || 'unlimited'}`}
                    hint="Once the day hits this number, students cannot buy more offline evaluations from you. This is the anti-burnout valve.">
                    <input type="range" min="0" max="30" value={maxCopies}
                      onChange={e => setMaxCopies(e.target.value)} className="mt-3 w-full" />
                    <div className="mt-1.5 flex justify-between text-[11px] font-bold text-ink-400">
                      <span>Off (no copy checking)</span><span>30 / day</span>
                    </div>
                  </Field>
                </div>
              </div>
            )}

            {/* ───────────────────────── 7. review & agreements */}
            {S.key === 'review' && (
              <div className="space-y-6">
                <div>
                  <p className="mb-3 text-[12.5px] font-extrabold text-ink-800">
                    Preview — exactly what a student sees
                  </p>
                  <div className="surface bg-ink-25 p-5">
                    <div className="flex items-start gap-3.5">
                      <Avatar name={user.name} initials={user.initials} hue={user.hue}
                        photo={user.photo} size={54} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-extrabold text-ink-900">{user.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-bold text-ink-500">
                          {(() => {
                            const M = CATEGORY_META[cr.category]?.icon || Icon.User
                            return <M size={12} />
                          })()}
                          {CATEGORY_META[cr.category]?.label} · {user.city || 'Remote'}
                        </p>
                        <Stars value={0} count={0} size={11} showValue={false} />
                      </div>
                      <Badge tone="mint" icon={<Icon.Shield size={11} />}>Pending ID check</Badge>
                    </div>
                    <p className="mt-3.5 text-[12.5px] leading-relaxed text-ink-600">
                      {cr.headline || <span className="text-ink-400">No headline yet</span>}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {cr.has_final_rank && cr.final_rank && (
                        <Badge tone="rank" icon={<Icon.Sparkle size={11} />}>
                          AIR {cr.final_rank} · {cr.service_allocated || 'CSE'}
                        </Badge>
                      )}
                      {cr.mains_cleared_years?.length > 0 && (
                        <Badge tone="verified" icon={<Icon.Check size={11} />}>
                          Mains Cleared '{String(Math.max(...cr.mains_cleared_years)).slice(-2)}
                        </Badge>
                      )}
                      {optionals.slice(0, 2).map(o => <Badge key={o} tone="violet">{o}</Badge>)}
                    </div>
                    <div className="mt-4 space-y-1.5 border-t border-ink-200 pt-3.5">
                      {activeServices.length === 0 && (
                        <p className="text-[12px] font-semibold text-nex-600">
                          No services switched on — students would have nothing to book.
                        </p>
                      )}
                      {activeServices.map(s => {
                        const I = SERVICE_ICON[s.kind]
                        const meta = cat.services?.[s.kind] || {}
                        return (
                          <div key={s.kind} className="flex items-center justify-between gap-3 text-[12.5px]">
                            <span className="flex items-center gap-2 font-semibold text-ink-700">
                              <I size={14} className="text-ink-400" />{meta.label}
                            </span>
                            <span className="font-extrabold text-ink-900 tnum">
                              {inr(num(s.price))} <span className="text-[10.5px] font-semibold text-ink-400">{meta.unit}</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="border-t border-ink-200 pt-6">
                  <p className="mb-1 text-[12.5px] font-extrabold text-ink-800">
                    Platform agreements
                  </p>
                  <p className="mb-4 text-[12px] text-ink-500">All four are mandatory.</p>
                  <div className="space-y-2.5">
                    {[
                      ['escrow', `The ${cat.escrow_hours}-hour escrow agreement`,
                       `I understand my earnings are held in escrow and released to my bank account ${cat.escrow_hours} hours after the service is completed, provided no dispute is raised.`],
                      ['sla', 'The SLA refund policy',
                       "I understand that if I fail to return an offline evaluation within my stated turnaround time, the student's payment is refunded automatically and I am not paid for it."],
                      ['nda', 'Non-disclosure agreement',
                       'I agree to keep all student queries, answers and interactions strictly confidential. I will not share student copies or session recordings on social media or Telegram.'],
                      ['commission', `Commission agreement — ${Math.round(cat.commission_rate * 100)}%`,
                       `I agree to the platform take-rate of ${Math.round(cat.commission_rate * 100)}%, deducted from my listed prices at the point of payout.`],
                    ].map(([key, title, body]) => (
                      <label key={key}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${agree[key] ? 'border-mint-300 bg-mint-50' : 'border-ink-200 hover:bg-ink-25'}`}>
                        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={agree[key]}
                          onChange={e => setAgree(a => ({ ...a, [key]: e.target.checked }))} />
                        <span>
                          <span className="block text-[12.5px] font-extrabold text-ink-900">{title}</span>
                          <span className="mt-1 block text-[11.5px] leading-relaxed text-ink-600">{body}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {Object.entries(done).some(([k, v]) => !v && k !== 'agreements') && (
                  <Alert tone="gold" icon={<Icon.Alert size={16} />} title="Some steps are still open">
                    {STEPS.filter(s => s.key !== 'review' && !done[s.key]).map(s => s.label).join(' · ')
                      || 'Finish the earlier screens before submitting.'}
                  </Alert>
                )}
              </div>
            )}

            {/* footer actions */}
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-ink-200 pt-5">
              <Button variant="ghost" disabled={step === 0}
                onClick={() => setStep(s => Math.max(0, s - 1))}>Back</Button>
              {S.key === 'review' ? (
                <Button size="lg" loading={busy} disabled={!allAgreed} onClick={submitForReview}
                  icon={<Icon.Shield size={16} />}>Submit for verification</Button>
              ) : (
                <Button size="lg" loading={busy} onClick={() => save(S.key)}
                  iconRight={<Icon.Chevron size={16} />}>Save & continue</Button>
              )}
            </div>
          </Card>

          <p className="mt-4 text-center text-[11.5px] text-ink-400">
            Everything saves as you go — you can close this and pick it up later.
          </p>
        </div>
      </div>
    </div>
  )
}
