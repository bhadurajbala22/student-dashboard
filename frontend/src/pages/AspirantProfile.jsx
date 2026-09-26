import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, Button, Card, ChipGroup, Field, Input, Loading, SectionHead,
  PhotoPicker, Select, Textarea, toast,
} from '../components/ui'
import { inr } from '../format'
import { useCatalog } from '../meta'

const num = (v) => (v === '' || v === null ? 0 : Number(v))

export default function AspirantProfile() {
  const { user, profile, setProfile, logout, isMentor } = useAuth()
  const cat = useCatalog()
  const [f, setF] = useState(() => ({ ...profile }))
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)

  if (isMentor) {
    return (
      <div className="a-rise">
        <Alert tone="nex" icon={<Icon.Info size={16} />} title="Mentors edit their profile in the storefront">
          Everything public — pricing, subjects, availability, credentials — lives in one place.{' '}
          <Link to="/app/storefront" className="font-extrabold underline">Open my storefront →</Link>
        </Alert>
      </div>
    )
  }

  if (!profile) return <Loading />
  const set = (k) => (v) => setF(p => ({ ...p, [k]: v }))
  const onIn = (k) => (e) => set(k)(e.target.value)

  const save = async () => {
    setBusy(true)
    try {
      const updated = await api.put('/students/me/profile', {
        display_name: f.name, mobile: f.mobile, city: f.city,
        target_year: num(f.target_year), previous_attempts: num(f.previous_attempts),
        optional_subject: f.optional_subject, preparation_stages: f.preparation_stages,
        biggest_hurdle: f.biggest_hurdle, graduation: f.graduation,
        languages: f.languages, budget_per_session: num(f.budget_per_session),
      })
      setProfile(updated); setF({ ...updated })
      toast.success('Profile updated')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const uploadPhoto = async (file) => {
    setPhotoBusy(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const updated = await api.upload('/students/me/photo', fd)
      setProfile(updated)
      setF(current => ({ ...current, photo: updated.photo }))
      toast.success('Profile photo updated')
    } catch (e) { toast.error(e.message) } finally { setPhotoBusy(false) }
  }

  return (
    <div className="a-rise">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink-900">My profile</h1>
          <p className="mt-1 text-[13.5px] text-ink-500">{user.email} · aspirant account</p>
        </div>
        <Button variant="outline" onClick={logout} icon={<Icon.Logout size={15} />}>Sign out</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <SectionHead icon={<Icon.Target size={15} className="text-ink-400" />}
            hint="Shared with every mentor you book — this is what keeps their advice consistent.">
            Benchmarking profile
          </SectionHead>

          <div className="space-y-5">
            <PhotoPicker name={f.name} initials={profile.initials} hue={profile.hue}
              photo={f.photo || profile.photo} onPick={uploadPhoto} busy={photoBusy} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><Input value={f.name || ''} onChange={onIn('name')} /></Field>
              <Field label="City"><Input value={f.city || ''} onChange={onIn('city')} /></Field>
              <Field label="Mobile"><Input value={f.mobile || ''} onChange={onIn('mobile')} /></Field>
              <Field label="Graduation">
                <Input value={f.graduation || ''} onChange={onIn('graduation')} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Target year">
                <Select value={f.target_year} onChange={onIn('target_year')}
                  options={[2026, 2027, 2028, 2029, 2030].map(y => ({ value: y, label: String(y) }))} />
              </Field>
              <Field label="Previous attempts">
                <Select value={f.previous_attempts} onChange={onIn('previous_attempts')}
                  options={[0, 1, 2, 3, 4, 5].map(n => ({ value: n, label: String(n) }))} />
              </Field>
              <Field label="Optional subject">
                <Select value={f.optional_subject || ''} onChange={onIn('optional_subject')}
                  placeholder="Not decided" options={cat.optional_subjects} />
              </Field>
            </div>

            <Field label="Current preparation stage" hint="Select everything that applies.">
              <ChipGroup options={cat.preparation_stages} value={f.preparation_stages || []}
                onChange={set('preparation_stages')} />
            </Field>

            <Field label="Languages">
              <ChipGroup small options={cat.languages.slice(0, 9)} value={f.languages || []}
                onChange={set('languages')} />
            </Field>

            <Field label="Your biggest hurdle right now"
              hint="Mentors read this before accepting a booking. Update it as things change."
              counter={`${(f.biggest_hurdle || '').length} / 800`}>
              <Textarea rows={5} maxLength={800} value={f.biggest_hurdle || ''}
                onChange={onIn('biggest_hurdle')} />
            </Field>

            <Field label={`Comfortable spend per session — ${inr(num(f.budget_per_session))}`}>
              <input type="range" min="100" max="3000" step="50" value={f.budget_per_session}
                onChange={onIn('budget_per_session')} className="mt-3 w-full" />
            </Field>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-ink-200 pt-5">
            <Button variant="ghost" onClick={() => setF({ ...profile })}>Reset</Button>
            <Button loading={busy} onClick={save} icon={<Icon.Check size={16} />}>Save changes</Button>
          </div>
        </Card>

        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <div className="flex items-center gap-3">
              <Avatar name={f.name} initials={profile.initials} hue={profile.hue}
                photo={f.photo || profile.photo} size={50} />
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-extrabold text-ink-900">{f.name}</p>
                <p className="text-[12px] text-ink-500">Target {f.target_year}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              <Badge tone="nex">
                {num(f.previous_attempts) === 0 ? 'First attempt' : `Attempt ${num(f.previous_attempts) + 1}`}
              </Badge>
              {f.optional_subject && <Badge tone="violet">{f.optional_subject}</Badge>}
              {(f.preparation_stages || []).slice(0, 2).map(s => (
                <Badge key={s} tone="ink">{s}</Badge>
              ))}
            </div>
          </Card>

          <Alert tone="nex" icon={<Icon.Shield size={16} />} title="What mentors can see">
            Everything on this page, plus your order history with them. In Anonymous Mode
            bookings, none of it is shared — not even your name.
          </Alert>

          <Card pad="p-4">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
              Account
            </p>
            <div className="mt-3 space-y-2 text-[12.5px]">
              <div className="flex justify-between gap-3">
                <span className="text-ink-500">Email</span>
                <span className="truncate font-bold text-ink-900">{user.email}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-500">Mobile</span>
                <span className="font-bold text-ink-900">{f.mobile || '—'}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
