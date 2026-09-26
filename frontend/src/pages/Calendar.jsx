import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Icon } from '../components/icons'
import WeekPlanner, { cellsToSlots, slotsToCells } from '../components/WeekPlanner'
import {
  Alert, Avatar, Badge, Bar, Button, Card, Empty, Field, Input, Loading, SectionHead, toast,
} from '../components/ui'
import { inr, minutesLabel, relative, shortStamp } from '../format'

export default function Calendar() {
  const { profile, setProfile } = useAuth()
  const [cells, setCells] = useState(() => slotsToCells(profile?.availability || []))
  const [maxCopies, setMaxCopies] = useState(profile?.max_daily_copies ?? 5)
  const [blackout, setBlackout] = useState({ date: '', reason: '' })
  const [upcoming, setUpcoming] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get('/orders?scope=upcoming').then(d => setUpcoming(d.results)).catch(() => {})
  }, [])

  const dirty = useMemo(() => {
    const now = JSON.stringify(cellsToSlots(cells).map(s => [s.day_of_week, s.start_time, s.end_time]).sort())
    const saved = JSON.stringify((profile?.availability || [])
      .map(s => [s.day_of_week, s.start_time, s.end_time]).sort())
    return now !== saved || Number(maxCopies) !== (profile?.max_daily_copies ?? 5)
  }, [cells, maxCopies, profile])

  const save = async () => {
    setBusy(true)
    try {
      setProfile(await api.put('/mentors/me/schedule', {
        slots: cellsToSlots(cells), max_daily_copies: Number(maxCopies),
      }))
      toast.success('Calendar updated — new slots are bookable right away')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const addBlackout = async () => {
    if (!blackout.date) return toast.error('Pick a date')
    try {
      setProfile(await api.post('/mentors/me/blackouts', blackout))
      setBlackout({ date: '', reason: '' })
      toast.success('Date blocked')
    } catch (e) { toast.error(e.message) }
  }

  const removeBlackout = async (date) => {
    try {
      setProfile(await api.del(`/mentors/me/blackouts/${date}`))
    } catch (e) { toast.error(e.message) }
  }

  if (!profile) return <Loading />

  const hours = cells.size
  const videoPrice = profile.prices?.video_1on1 || 0
  const ceiling = hours * 2 * videoPrice

  return (
    <div className="a-rise">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink-900">Calendar & workload</h1>
          <p className="mt-1 text-[13.5px] text-ink-500">
            Paint the hours you are genuinely free. Everything repeats weekly, all times IST.
          </p>
        </div>
        <Button loading={busy} disabled={!dirty} onClick={save} icon={<Icon.Check size={16} />}>
          {dirty ? 'Save changes' : 'Saved'}
        </Button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Open hours / week', hours, `${hours * 2} bookable 30-min slots`],
          ['Weekly ceiling', inr(ceiling), videoPrice ? `at ${inr(videoPrice)} per 30 min, fully booked` : 'set a video price first'],
          ['Daily copy cap', maxCopies || 'off', 'answers you will accept per day'],
          ['Blackout dates', profile.blackouts?.length || 0, 'days you are unavailable'],
        ].map(([label, value, hint]) => (
          <Card key={label} pad="p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">{label}</p>
            <p className="mt-2 text-[24px] font-extrabold leading-none text-ink-900 tnum">{value}</p>
            <p className="mt-2 text-[11.5px] text-ink-500">{hint}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <SectionHead icon={<Icon.Calendar size={16} className="text-ink-400" />}
              hint="Click and drag across the grid — this is what students see as bookable slots">
              Weekly planner
            </SectionHead>
            <WeekPlanner cells={cells} onChange={setCells} />
          </Card>

          <Card>
            <SectionHead icon={<Icon.Pdf size={16} className="text-ink-400" />}
              hint="The anti-burnout valve for asynchronous copy checking">
              Offline workload cap
            </SectionHead>
            <Field label={`Maximum answers per day — ${maxCopies || 'copy checking off'}`}
              hint="Once a day hits this number, aspirants cannot buy more evaluations from you until tomorrow.">
              <input type="range" min="0" max="30" value={maxCopies}
                onChange={e => setMaxCopies(e.target.value)} className="mt-3 w-full" />
              <div className="mt-1.5 flex justify-between text-[11px] font-bold text-ink-400">
                <span>Off</span><span>30 / day</span>
              </div>
            </Field>
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <SectionHead icon={<Icon.Pin size={15} className="text-ink-400" />}>
              Blackout dates
            </SectionHead>
            <div className="space-y-3">
              <Field label="Date">
                <Input type="date" value={blackout.date}
                  onChange={e => setBlackout(b => ({ ...b, date: e.target.value }))} />
              </Field>
              <Field label="Reason">
                <Input placeholder="Travelling" value={blackout.reason}
                  onChange={e => setBlackout(b => ({ ...b, reason: e.target.value }))} />
              </Field>
              <Button variant="outline" className="w-full" onClick={addBlackout}
                icon={<Icon.Plus size={15} />}>Block this date</Button>
            </div>
            {profile.blackouts?.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-ink-100 pt-3.5">
                {profile.blackouts.map(b => (
                  <div key={b.date}
                    className="flex items-center gap-2 rounded-xl bg-nex-50 px-3 py-2">
                    <Icon.Pin size={13} className="shrink-0 text-nex-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-extrabold text-nex-800">{b.date}</p>
                      {b.reason && <p className="truncate text-[11px] text-nex-600">{b.reason}</p>}
                    </div>
                    <button onClick={() => removeBlackout(b.date)}
                      className="shrink-0 rounded-lg p-1 text-nex-600 hover:bg-white hover:text-nex-800">
                      <Icon.X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <SectionHead icon={<Icon.Clock size={15} className="text-ink-400" />}>
              Booked ahead
            </SectionHead>
            {upcoming.length === 0 ? (
              <p className="py-4 text-center text-[12.5px] text-ink-400">Nothing booked yet.</p>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map(o => (
                  <div key={o.id} className="flex items-start gap-2.5">
                    <Avatar name={o.student?.name} initials={o.student?.initials} hue={o.student?.hue}
                      anonymous={o.student?.anonymous} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink-900">{o.student?.name}</p>
                      <p className="text-[11px] text-ink-500">
                        {shortStamp(o.start_at)} · {minutesLabel(o.duration_minutes)}
                      </p>
                    </div>
                    <Badge tone={o.status === 'confirmed' ? 'nex' : 'gold'} size="sm">{o.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Alert tone="nex" icon={<Icon.Info size={16} />} title="How aspirants see this">
            Each painted hour becomes two 30-minute slots for the next three weeks. Anything
            already booked shows as taken, blackout dates disappear entirely, and slots less than
            30 minutes away are hidden.
          </Alert>
        </div>
      </div>
    </div>
  )
}
