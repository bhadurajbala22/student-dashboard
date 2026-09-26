import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { CATEGORY_META, MentorCard, SERVICE_ICON } from '../components/domain'
import { Icon } from '../components/icons'
import {
  Badge, Button, Card, Empty, Field, Input, Loading, Segmented, Select, Skeleton, Toggle,
} from '../components/ui'
import { inr } from '../format'
import { useCatalog } from '../meta'

const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_low', label: 'Price: low → high' },
  { value: 'price_high', label: 'Price: high → low' },
  { value: 'experience', label: 'Most experience' },
  { value: 'selections', label: 'Most selections' },
]

const BLANK = {
  service: '', subject: '', category: '', language: '', optional_subject: '',
  min_price: 0, max_price: 0, min_rating: 0, availability: '', verified_only: false,
}

export default function Discover() {
  const { profile, user } = useAuth()
  const isGuest = !user
  const cat = useCatalog()

  /* The public header links straight into a filtered roster (?service=…,
     ?category=…, ?q=…), so seed the controls from the URL on first render. */
  const [params] = useSearchParams()
  const [q, setQ] = useState(() => params.get('q') || '')
  const [f, setF] = useState(() => ({
    ...BLANK,
    service: params.get('service') || '',
    category: params.get('category') || '',
    subject: params.get('subject') || '',
  }))
  const [sort, setSort] = useState('recommended')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openFilters, setOpenFilters] = useState(false)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    Object.entries(f).forEach(([k, v]) => {
      if (v !== '' && v !== 0 && v !== false) p.set(k, String(v))
    })
    p.set('sort', sort)
    return p.toString()
  }, [q, f, sort])

  useEffect(() => {
    setLoading(true)
    const id = setTimeout(() => {
      api.get(`/mentors?${query}`).then(setData).finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(id)
  }, [query])

  const set = (k) => (v) => setF(p => ({ ...p, [k]: v?.target ? v.target.value : v }))
  const activeCount = Object.entries(f).filter(([, v]) => v !== '' && v !== 0 && v !== false).length
  const subjects = cat.all_subjects || []

  return (
    <div className={`a-rise ${isGuest ? 'mx-auto max-w-[1200px] px-4 py-8 sm:px-6' : ''}`}>
      <div className="mb-6">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-ink-900">
          Search verified mentors,
          <span className="serif italic font-normal"> faculties and rankers.</span>
        </h1>
        <p className="mt-1.5 text-[13.5px] text-ink-500">
          {data ? `${data.count} of ${data.total} mentors match` : 'Loading the roster'} · every
          profile is manually ID-verified · all times IST
        </p>
        {isGuest && (
          <p className="mt-3 flex items-start gap-2 rounded-2xl bg-nex-50 px-4 py-3 text-[12.5px] leading-relaxed text-nex-900 sm:max-w-2xl">
            <Icon.Info size={15} className="mt-px shrink-0 text-nex-600" />
            <span>
              No account needed to look. Open any profile to see credentials, prices,
              availability and reviews — we only ask for your details at the point of booking.
            </span>
          </p>
        )}
      </div>

      {/* ───────────────────────────────────── service quick-pick */}
      <div className="mb-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(cat.services || {}).map(([kind, meta]) => {
          const I = SERVICE_ICON[kind]
          const on = f.service === kind
          const swatch = {
            video_1on1: 'bg-nex-50 text-nex-600', offline_eval: 'bg-gold-50 text-gold-600',
            live_eval: 'bg-gold-50 text-gold-600', retainer: 'bg-mint-50 text-mint-600',
          }[kind]
          return (
            <button key={kind} onClick={() => set('service')(on ? '' : kind)}
              className={`focusable surface flex items-start gap-3 p-3.5 text-left transition ${on ? '!border-nex-500 ring-1 ring-nex-500' : 'hover:border-nex-200 hover:lift'}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${swatch}`}>
                <I size={17} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-extrabold text-ink-900">{meta.short}</span>
                <span className="block text-[10.5px] font-semibold text-ink-400">{meta.unit}</span>
              </span>
              {on && <Icon.Check size={15} className="ml-auto shrink-0 text-nex-600" />}
            </button>
          )
        })}
      </div>

      {/* ───────────────────────────────────────── filter bar */}
      <Card pad="p-4" className="mb-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Icon.Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <Input className="!pl-10" placeholder="Search by name, subject, university, optional…"
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <Select className="!w-auto" value={sort} onChange={e => setSort(e.target.value)} options={SORTS} />
          <Button variant={openFilters ? 'dark' : 'outline'} onClick={() => setOpenFilters(o => !o)}
            icon={<Icon.Filter size={16} />}>
            Filters
            {activeCount > 0 && (
              <span className="ml-1 rounded-full bg-gold-500 px-1.5 text-[10.5px] text-white tnum">{activeCount}</span>
            )}
          </Button>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setF(BLANK)}>Clear</Button>
          )}
        </div>

        {/* active chips */}
        {activeCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(f).filter(([, v]) => v !== '' && v !== 0 && v !== false).map(([k, v]) => (
              <button key={k} onClick={() => set(k)(BLANK[k])}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-700 hover:bg-ink-200">
                {k === 'service' ? cat.services?.[v]?.short
                  : k === 'category' ? CATEGORY_META[v]?.label
                    : k === 'max_price' ? `Under ${inr(v)}`
                      : k === 'min_price' ? `Above ${inr(v)}`
                        : k === 'min_rating' ? `${v}★ and up`
                          : k === 'availability' ? (v === 'today' ? 'Free today' : 'Free this week')
                            : k === 'verified_only' ? 'ID verified' : String(v)}
                <Icon.X size={11} />
              </button>
            ))}
          </div>
        )}

        {openFilters && (
          <div className="mt-4 grid gap-4 border-t border-ink-200 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Subject area">
              <Select value={f.subject} onChange={set('subject')} placeholder="Any subject"
                options={subjects} />
            </Field>
            <Field label="Mentor category">
              <Select value={f.category} onChange={set('category')} placeholder="Any category"
                options={Object.entries(cat.mentor_categories || {}).map(([k, v]) => ({
                  value: k, label: v.label,
                }))} />
            </Field>
            <Field label="Optional subject">
              <Select value={f.optional_subject} onChange={set('optional_subject')}
                placeholder="Any" options={cat.optional_subjects} />
            </Field>
            <Field label="Language">
              <Select value={f.language} onChange={set('language')} placeholder="Any language"
                options={cat.languages} />
            </Field>

            <Field label={f.max_price ? `Price up to ${inr(f.max_price)}` : 'Price — any'}
              hint={f.service ? `For ${cat.services?.[f.service]?.short?.toLowerCase()}` : 'Across all services'}>
              <input type="range" min="0" max="3000" step="50" value={f.max_price}
                onChange={set('max_price')} className="mt-3 w-full" />
            </Field>
            <Field label={f.min_rating ? `${f.min_rating}★ and above` : 'Rating — any'}>
              <input type="range" min="0" max="5" step="0.5" value={f.min_rating}
                onChange={set('min_rating')} className="mt-3 w-full" />
            </Field>
            <Field label="Availability">
              <Segmented value={f.availability}
                onChange={v => set('availability')(f.availability === v ? '' : v)}
                options={[{ value: 'today', label: 'Today' }, { value: 'week', label: 'This week' }]} />
            </Field>
            <div className="flex items-end pb-1">
              <Toggle checked={f.verified_only} onChange={set('verified_only')}
                label="ID-verified only" hint="Aadhaar, PAN and marksheets checked" />
            </div>
          </div>
        )}
      </Card>

      {/* budget nudge */}
      {profile?.budget_per_session > 0 && !f.max_price && (
        <button onClick={() => set('max_price')(profile.budget_per_session)}
          className="mb-5 flex w-full items-center gap-2.5 rounded-2xl bg-nex-50 px-4 py-3 text-left transition hover:bg-nex-100">
          <Icon.Wallet size={16} className="shrink-0 text-nex-600" />
          <p className="flex-1 text-[12.5px] text-nex-900">
            You set a comfortable spend of <span className="font-extrabold">{inr(profile.budget_per_session)}</span> per
            session. Filter to mentors inside that?
          </p>
          <span className="shrink-0 text-[12px] font-extrabold text-nex-700">Apply →</span>
        </button>
      )}

      {/* ───────────────────────────────────────────── results */}
      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><Skeleton className="h-14 w-full" /><Skeleton className="mt-3 h-10 w-full" />
              <Skeleton className="mt-3 h-16 w-full" /></Card>
          ))}
        </div>
      ) : data?.count === 0 ? (
        <Empty icon={<Icon.Search size={22} />} title="No mentors match those filters"
          hint="Try widening the price range, clearing the subject, or switching the service type."
          action={<Button variant="outline" onClick={() => { setF(BLANK); setQ('') }}>Clear everything</Button>} />
      ) : (
        <div className={`grid gap-4 md:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
          {data.results.map(m => <MentorCard key={m.id} m={m}
            base={isGuest ? "/mentors" : "/app/mentors"} />)}
        </div>
      )}
    </div>
  )
}
