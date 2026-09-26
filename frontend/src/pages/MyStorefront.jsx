import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { CATEGORY_META, SERVICE_ICON } from '../components/domain'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, BadgeRow, Button, Card, ChipGroup, Field, Input, Loading, SectionHead,
  PhotoPicker, Segmented, Select, Stars, Textarea, Toggle, toast,
} from '../components/ui'
import { inr } from '../format'
import { useCatalog } from '../meta'

const num = (v) => (v === '' || v === null ? 0 : Number(v))

export default function MyStorefront() {
  const { user, profile, setProfile, logout } = useAuth()
  const cat = useCatalog()
  const [tab, setTab] = useState('services')
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [guide, setGuide] = useState(null)

  const [services, setServices] = useState([])
  const [expertise, setExpertise] = useState({})
  const [optionals, setOptionals] = useState([])
  const [cr, setCr] = useState({})
  const [serviceTab, setServiceTab] = useState('video_1on1')

  useEffect(() => {
    if (!profile) return
    const byKind = Object.fromEntries((profile.services || []).map(s => [s.kind, s]))
    setServices(['video_1on1', 'offline_eval', 'live_eval', 'retainer'].map(kind => ({
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
    })))
    setExpertise(profile.expertise || {})
    setOptionals(profile.optional_subjects || [])
    setCr({
      category: profile.category, headline: profile.headline || '',
      philosophy: profile.philosophy || '', employment_status: profile.employment_status || '',
      languages: profile.languages || [], display_name: profile.name,
      city: profile.city === 'Remote' ? '' : profile.city,
      highest_qualification: profile.highest_qualification || '',
      university: profile.university || '', other_credentials: profile.other_credentials || '',
      teaching_years: profile.teaching_years ?? 0,
      online_teaching_years: profile.online_teaching_years ?? 0,
      students_mentored: profile.students_mentored ?? 0,
      selections_produced: profile.selections_produced ?? 0,
    })
  }, [profile])

  useEffect(() => {
    if (!profile) return
    const id = setTimeout(() => {
      api.post('/rate-guidance', {
        ...cr,
        has_final_rank: profile.has_final_rank, final_rank: profile.final_rank,
        interview_years: profile.interview_years, mains_cleared_years: profile.mains_cleared_years,
        prelims_cleared_years: profile.prelims_cleared_years,
        expertise, optional_subjects: optionals,
      }).then(setGuide).catch(() => {})
    }, 260)
    return () => clearTimeout(id)
  }, [cr, expertise, optionals, profile])

  if (!profile) return <Loading />

  const svc = (kind) => services.find(s => s.kind === kind) || {}
  const setSvc = (kind, patch) =>
    setServices(prev => prev.map(s => (s.kind === kind ? { ...s, ...patch } : s)))

  const saveServices = async () => {
    setBusy(true)
    try {
      setProfile(await api.put('/mentors/me/services', {
        services: services.map(s => ({ ...s, price: num(s.price) })),
      }))
      toast.success('Pricing updated')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const saveExpertise = async () => {
    setBusy(true)
    try {
      setProfile(await api.put('/mentors/me/expertise', {
        expertise, optional_subjects: optionals,
      }))
      toast.success('Subjects updated')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const saveProfile = async () => {
    setBusy(true)
    try {
      setProfile(await api.put('/mentors/me/credentials', {
        ...cr,
        teaching_years: num(cr.teaching_years),
        online_teaching_years: num(cr.online_teaching_years),
        students_mentored: num(cr.students_mentored),
        selections_produced: num(cr.selections_produced),
      }))
      toast.success('Profile updated — live immediately')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const uploadPhoto = async (file) => {
    setPhotoBusy(true)
    const fd = new FormData()
    fd.append('kind', 'photo')
    fd.append('file', file)
    try {
      setProfile(await api.upload('/mentors/me/proof', fd))
      toast.success('Profile photo updated')
    } catch (e) { toast.error(e.message) } finally { setPhotoBusy(false) }
  }

  const toggleListing = async () => {
    try {
      setProfile(await api.post('/mentors/me/listing'))
    } catch (e) { toast.error(e.message) }
  }

  const activeServices = services.filter(s => s.is_active && num(s.price) > 0)
  const meta = CATEGORY_META[cr.category] || CATEGORY_META.veteran

  return (
    <div className="a-rise">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink-900">My storefront</h1>
          <p className="mt-1 text-[13.5px] text-ink-500">
            {user.email} · {profile.is_verified ? 'ID verified' : 'verification pending'} ·{' '}
            {profile.is_listed ? 'discoverable' : 'hidden from discovery'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleListing}>
            {profile.is_listed ? 'Pause listing' : 'Go live'}
          </Button>
          <Button variant="ghost" size="sm" onClick={logout} icon={<Icon.Logout size={14} />}>
            Sign out
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div>
          <Segmented className="mb-5" value={tab} onChange={setTab} options={[
            { value: 'services', label: 'Pricing' },
            { value: 'subjects', label: 'Subjects' },
            { value: 'profile', label: 'Profile' },
            { value: 'kyc', label: 'Verification' },
          ]} />

          {/* ─────────────────────────────────── pricing */}
          {tab === 'services' && (
            <Card>
              <SectionHead icon={<Icon.Wallet size={16} className="text-ink-400" />}
                hint={`You keep ${Math.round((1 - cat.commission_rate) * 100)}% of every price you set here.`}>
                Services & pricing
              </SectionHead>

              <Segmented full className="mb-5" value={serviceTab} onChange={setServiceTab}
                options={Object.entries(cat.services || {}).map(([k, v]) => ({
                  value: k, label: v.short,
                }))} />

              {['video_1on1', 'offline_eval', 'live_eval', 'retainer']
                .filter(k => k === serviceTab).map(kind => {
                  const s = svc(kind)
                  const m = cat.services?.[kind] || {}
                  const I = SERVICE_ICON[kind]
                  const band = guide?.band?.[kind]
                  const earn = Math.round(num(s.price) * (1 - cat.commission_rate))
                  return (
                    <div key={kind} className="space-y-4">
                      <div className="flex items-start gap-3.5 rounded-2xl bg-ink-25 p-4">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-nex-600">
                          <I size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[14.5px] font-extrabold text-ink-900">{m.label}</h3>
                          <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{m.delivery}</p>
                        </div>
                      </div>

                      <Toggle checked={s.is_active} onChange={v => setSvc(kind, { is_active: v })}
                        label={`Offer ${m.short?.toLowerCase()}`}
                        hint={s.is_active ? 'Shown on your storefront' : 'Hidden from aspirants'} />

                      {s.is_active && (
                        <>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <Field label={`Your price ${m.unit}`} required
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
                                after the {Math.round(cat.commission_rate * 100)}% fee
                              </p>
                            </div>
                          </div>

                          {kind === 'video_1on1' && (
                            <Field label="Session expertise tags" required>
                              <ChipGroup options={cat.session_tags} value={s.session_tags}
                                onChange={v => setSvc(kind, { session_tags: v })} />
                            </Field>
                          )}
                          {kind === 'offline_eval' && (
                            <Field label="Guaranteed turnaround (SLA)" required
                              hint="Miss it and the aspirant is refunded automatically.">
                              <Segmented value={s.sla_hours}
                                onChange={v => setSvc(kind, { sla_hours: v })}
                                options={(cat.sla_choices || []).map(h => ({ value: h, label: `${h} hours` }))} />
                            </Field>
                          )}
                          {kind === 'retainer' && (
                            <>
                              <Field label="Package title" required>
                                <Input value={s.package_title}
                                  onChange={e => setSvc(kind, { package_title: e.target.value })} />
                              </Field>
                              <Field label="Deliverables" required>
                                <Textarea rows={3} value={s.deliverables}
                                  onChange={e => setSvc(kind, { deliverables: e.target.value })} />
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
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}

              <div className="mt-6 flex justify-end border-t border-ink-200 pt-5">
                <Button loading={busy} onClick={saveServices} icon={<Icon.Check size={16} />}>
                  Save pricing
                </Button>
              </div>
            </Card>
          )}

          {/* ─────────────────────────────────── subjects */}
          {tab === 'subjects' && (
            <Card>
              <SectionHead icon={<Icon.Book size={16} className="text-ink-400" />}
                hint="These are the exact filters aspirants search on.">
                Subject matter expertise
              </SectionHead>
              <div className="space-y-5">
                {Object.entries(cat.subject_groups || {}).map(([gkey, group]) => (
                  <Field key={gkey} label={group.label}>
                    <ChipGroup options={group.items} value={expertise[gkey] || []}
                      onChange={v => setExpertise(e => ({ ...e, [gkey]: v }))} />
                  </Field>
                ))}
                <Field label="Optional subjects">
                  <ChipGroup small options={cat.optional_subjects} value={optionals}
                    onChange={setOptionals} />
                </Field>
              </div>
              <div className="mt-6 flex justify-end border-t border-ink-200 pt-5">
                <Button loading={busy} onClick={saveExpertise} icon={<Icon.Check size={16} />}>
                  Save subjects
                </Button>
              </div>
            </Card>
          )}

          {/* ─────────────────────────────────── profile */}
          {tab === 'profile' && (
            <Card>
              <SectionHead icon={<Icon.User size={16} className="text-ink-400" />}>
                Public profile
              </SectionHead>
              <div className="space-y-4">
                <PhotoPicker name={cr.display_name} initials={profile.initials} hue={profile.hue}
                  photo={profile.photo} onPick={uploadPhoto} busy={photoBusy} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Display name">
                    <Input value={cr.display_name || ''}
                      onChange={e => setCr(c => ({ ...c, display_name: e.target.value }))} />
                  </Field>
                  <Field label="City">
                    <Input value={cr.city || ''}
                      onChange={e => setCr(c => ({ ...c, city: e.target.value }))} />
                  </Field>
                  <Field label="Mentor category">
                    <Select value={cr.category}
                      options={Object.entries(cat.mentor_categories || {}).map(([k, v]) => ({
                        value: k, label: v.label,
                      }))}
                      onChange={e => setCr(c => ({ ...c, category: e.target.value }))} />
                  </Field>
                  <Field label="Employment status">
                    <Select value={cr.employment_status} placeholder="Select"
                      options={cat.employment_statuses}
                      onChange={e => setCr(c => ({ ...c, employment_status: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Headline" counter={`${(cr.headline || '').length} / 140`}>
                  <Input maxLength={140} value={cr.headline || ''}
                    onChange={e => setCr(c => ({ ...c, headline: e.target.value }))} />
                </Field>
                <Field label="Teaching philosophy"
                  counter={`${(cr.philosophy || '').trim().split(/\s+/).filter(Boolean).length} / 250 words`}>
                  <Textarea rows={7} value={cr.philosophy || ''}
                    onChange={e => setCr(c => ({ ...c, philosophy: e.target.value }))} />
                </Field>
                <Field label="Languages of instruction">
                  <ChipGroup small options={cat.languages.slice(0, 9)} value={cr.languages || []}
                    onChange={v => setCr(c => ({ ...c, languages: v }))} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Highest qualification">
                    <Select value={cr.highest_qualification} placeholder="Select"
                      options={cat.qualifications}
                      onChange={e => setCr(c => ({ ...c, highest_qualification: e.target.value }))} />
                  </Field>
                  <Field label="University">
                    <Input value={cr.university || ''}
                      onChange={e => setCr(c => ({ ...c, university: e.target.value }))} />
                  </Field>
                  <Field label="Teaching years">
                    <Input type="number" step="0.5" value={cr.teaching_years}
                      onChange={e => setCr(c => ({ ...c, teaching_years: e.target.value }))} />
                  </Field>
                  <Field label="Online teaching years">
                    <Input type="number" step="0.5" value={cr.online_teaching_years}
                      onChange={e => setCr(c => ({ ...c, online_teaching_years: e.target.value }))} />
                  </Field>
                  <Field label="Students mentored">
                    <Input type="number" value={cr.students_mentored}
                      onChange={e => setCr(c => ({ ...c, students_mentored: e.target.value }))} />
                  </Field>
                  <Field label="Students in the final list">
                    <Input type="number" value={cr.selections_produced}
                      onChange={e => setCr(c => ({ ...c, selections_produced: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Other credentials">
                  <Textarea rows={3} value={cr.other_credentials || ''}
                    onChange={e => setCr(c => ({ ...c, other_credentials: e.target.value }))} />
                </Field>
              </div>
              <div className="mt-6 flex justify-end border-t border-ink-200 pt-5">
                <Button loading={busy} onClick={saveProfile} icon={<Icon.Check size={16} />}>
                  Save profile
                </Button>
              </div>
            </Card>
          )}

          {/* ─────────────────────────────────── kyc */}
          {tab === 'kyc' && (
            <Card>
              <SectionHead icon={<Icon.Shield size={16} className="text-ink-400" />}
                hint="Submitted once and checked by hand. Only masked values are stored.">
                Identity & payouts
              </SectionHead>
              <div className="space-y-4">
                <Alert tone={profile.is_verified ? 'mint' : 'gold'}
                  icon={profile.is_verified ? <Icon.Check size={16} /> : <Icon.Clock size={16} />}
                  title={profile.is_verified ? 'Verified' : `Status: ${profile.verification_status}`}>
                  {profile.is_verified
                    ? `Your documents were approved${profile.verified_at ? '' : ''}. Your badges are live on your public card.`
                    : 'Our team is still reviewing your documents.'}
                </Alert>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['Legal name', profile.legal_name, Icon.User],
                    ['Aadhaar', profile.aadhaar_masked, Icon.Id],
                    ['PAN', profile.pan_masked, Icon.Id],
                    ['Mobile', profile.mobile, Icon.Phone],
                    ['Bank account', profile.bank_account_masked, Icon.Bank],
                    ['IFSC', profile.bank_ifsc, Icon.Bank],
                  ].filter(([, v]) => v).map(([k, v, I]) => (
                    <div key={k} className="rounded-xl border border-ink-200 p-3.5">
                      <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                        <I size={12} />{k}
                      </p>
                      <p className="mt-1 text-[13px] font-extrabold text-ink-900">{v}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-2 text-[12px] font-extrabold text-ink-700">Documents on file</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.kyc_docs || {}).map(([k, on]) => (
                      <Badge key={k} tone={on ? 'mint' : 'ink'}
                        icon={on ? <Icon.Check size={11} /> : <Icon.X size={11} />}>
                        {k.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-[12px] font-extrabold text-ink-700">Agreements accepted</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.agreements || {}).map(([k, on]) => (
                      <Badge key={k} tone={on ? 'mint' : 'rose'}
                        icon={on ? <Icon.Check size={11} /> : <Icon.X size={11} />}>
                        {k}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Alert tone="ink" icon={<Icon.Lock size={15} />}>
                  To change your bank details or re-submit a document, contact support — payout
                  changes are deliberately not self-service.
                </Alert>
              </div>
            </Card>
          )}
        </div>

        {/* ─────────────────────────────── live preview */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <div>
            <p className="mb-2.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
              How your card looks
            </p>
            <Card>
              <div className="flex items-start gap-3.5">
                <Avatar name={cr.display_name} initials={profile.initials} hue={profile.hue}
                  photo={profile.photo} size={50} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14.5px] font-extrabold text-ink-900">
                    {cr.display_name}
                  </h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-ink-500">
                    <meta.icon size={11} />{meta.label}
                  </p>
                  <Stars value={profile.rating} count={profile.rating_count} size={11} />
                </div>
                {profile.is_verified && (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint-50 text-mint-600">
                    <Icon.Shield size={13} />
                  </span>
                )}
              </div>
              <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-ink-600">
                {cr.headline}
              </p>
              <div className="mt-3"><BadgeRow badges={profile.badges} max={3} size="sm" /></div>
              <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-ink-100 pt-3.5">
                {activeServices.map(s => {
                  const I = SERVICE_ICON[s.kind]
                  const m = cat.services?.[s.kind] || {}
                  return (
                    <div key={s.kind} className="flex items-center gap-1.5 text-[11.5px]">
                      <I size={13} className="shrink-0 text-ink-400" />
                      <span className="font-semibold text-ink-500">{inr(num(s.price))}</span>
                      <span className="truncate text-ink-400">{m.unit}</span>
                    </div>
                  )
                })}
                {activeServices.length === 0 && (
                  <p className="col-span-2 text-[11.5px] font-semibold text-nex-600">
                    No services on — nothing for aspirants to book.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <Card pad="p-4">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
              Your numbers
            </p>
            <div className="mt-3 space-y-2 text-[12.5px]">
              {[
                ['Orders delivered', profile.orders_completed],
                ['Rating', profile.rating ? `${profile.rating} (${profile.rating_count})` : '—'],
                ['Live windows', `${profile.slot_count || 0} / week`],
                ['Setup complete', `${profile.onboarding?.percent || 100}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-ink-500">{k}</span>
                  <span className="font-extrabold text-ink-900">{v}</span>
                </div>
              ))}
            </div>
            <Button as={Link} to="/app/calendar" size="sm" variant="outline" className="mt-4 w-full">
              Manage availability
            </Button>
          </Card>

          {guide && (
            <Card pad="p-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                Reference rates now
              </p>
              <div className="mt-3 space-y-2">
                {Object.entries(guide.rates).map(([kind, price]) => {
                  const I = SERVICE_ICON[kind]
                  return (
                    <div key={kind} className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="flex items-center gap-1.5 font-semibold text-ink-600">
                        <I size={13} className="text-ink-400" />
                        {cat.services?.[kind]?.short}
                      </span>
                      <span className="font-extrabold text-ink-900 tnum">{inr(price)}</span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[10.5px] leading-snug text-ink-400">{guide.note}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
