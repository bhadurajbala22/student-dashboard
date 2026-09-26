import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { EscrowNote, SERVICE_ICON, SlaChip, StatusChip } from '../components/domain'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, Bar, Button, Card, Empty, Loading, SectionHead, Stat, toast,
} from '../components/ui'
import { countdown, firstName, fullStamp, inr, minutesLabel, relative, shortStamp } from '../format'
import { useCatalog } from '../meta'

function Countdown({ iso, minutes }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])
  return <span>{relative(iso)}</span>
}

/* ─────────────────────────────────── 5A: upcoming live sessions */
function SessionCard({ o }) {
  const live = o.join_open
  return (
    <Card className={live ? '!border-mint-300 !bg-mint-50' : ''}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={live ? 'mint' : 'nex'} icon={<Icon.Clock size={11} />}>
              {live ? 'Starting now' : <Countdown iso={o.start_at} />}
            </Badge>
            <StatusChip status={o.status} label={o.status_label} />
            {o.is_anonymous && (
              <Badge tone="dark" icon={<Icon.Incognito size={11} />}>Anonymous</Badge>
            )}
          </div>
          <h3 className="mt-2.5 text-[17px] font-extrabold tracking-[-0.02em] text-ink-900">{o.title}</h3>
          <p className="mt-1 text-[12.5px] text-ink-600">
            {o.subject ? `${o.subject} · ` : ''}with{' '}
            <span className="font-bold">{o.mentor?.name}</span>
          </p>
          <p className="mt-2 text-[12.5px] font-bold text-ink-700">
            {fullStamp(o.start_at)} · {minutesLabel(o.duration_minutes)} ·{' '}
            {o.paid_with_credit ? 'retainer credit' : inr(o.amount)}
          </p>
          {o.agenda && (
            <p className="mt-2.5 rounded-xl bg-white/70 px-3 py-2 text-[12px] italic leading-relaxed text-ink-600">
              “{o.agenda}”
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {live && o.meeting_link ? (
            <Button as="a" href={o.meeting_link} target="_blank" rel="noreferrer" variant="mint"
              icon={<Icon.Video size={16} />} className="a-breathe">Join video room</Button>
          ) : o.status === 'confirmed' ? (
            <Button variant="outline" disabled icon={<Icon.Video size={16} />}>
              Opens 5 min before
            </Button>
          ) : null}
          <Button as={Link} to="/app/orders" variant="ghost" size="sm">Details</Button>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 border-t border-ink-200/60 pt-3 text-[11px] text-ink-500">
        <Icon.Lock size={12} />
        For quality assurance this session is recorded internally. Neither side can download it.
      </p>
    </Card>
  )
}

/* ────────────────────── 5B: pending offline evaluations tracker */
function EvalCard({ o }) {
  const steps = [
    ['Sent to mentor', o.progress?.submitted],
    ['Mentor evaluating', o.progress?.evaluating],
    ['Evaluation ready', o.progress?.ready],
  ]
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-[13.5px] font-extrabold text-ink-900">{o.title}</h4>
            <StatusChip status={o.status} label={o.status_label} />
          </div>
          <p className="mt-1 text-[12px] text-ink-500">
            {o.subject ? `${o.subject} · ` : ''}{o.mentor?.name} ·{' '}
            <span className="font-mono text-[11px]">{o.reference}</span>
          </p>
        </div>
        <SlaChip hours={o.sla_hours} breached={o.sla_breached} hoursLeft={o.sla_hours_left} />
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {steps.map(([label, on], i) => (
          <div key={label} className="flex flex-1 items-center gap-1.5">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${on ? 'bg-mint-600 text-white' : 'bg-ink-200 text-ink-500'}`}>
              {on ? <Icon.Check size={12} /> : i + 1}
            </span>
            <span className={`hidden text-[11px] font-bold sm:block ${on ? 'text-ink-800' : 'text-ink-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && <span className={`h-px flex-1 ${steps[i + 1][1] ? 'bg-mint-400' : 'bg-ink-200'}`} />}
          </div>
        ))}
      </div>

      {o.sla_hours_left !== null && o.sla_hours_left !== undefined && !o.progress?.ready && (
        <div className="mt-3.5">
          <Bar value={Math.max(0, o.sla_hours_left)} max={o.sla_hours}
            tone={o.sla_hours_left < 6 ? 'rose' : o.sla_hours_left < 18 ? 'gold' : 'mint'} />
          <p className="mt-1.5 text-[11px] font-semibold text-ink-500">
            SLA deadline: {countdown(o.sla_hours_left)} remaining of {o.sla_hours}h
            {o.sla_hours_left < 6 && ' — miss it and you are refunded automatically'}
          </p>
        </div>
      )}

      {o.annotation_count > 0 && (
        <Link to={`/app/review/${o.id}`}
          className="mt-4 flex items-center gap-2.5 rounded-xl bg-nex-50 px-3.5 py-3 transition hover:bg-nex-100">
          <Icon.Pencil size={16} className="shrink-0 text-nex-600" />
          <span className="min-w-0 flex-1 text-[12px] font-extrabold text-nex-900">
            {o.annotation_count} mark{o.annotation_count === 1 ? '' : 's'} on your copy
          </span>
          <span className="shrink-0 text-[11.5px] font-extrabold text-nex-700">Open →</span>
        </Link>
      )}
      {o.has_return && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-mint-50 px-3.5 py-3">
          <Icon.Pdf size={16} className="shrink-0 text-mint-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-extrabold text-mint-700">{o.returned_name}</p>
            {o.marks_awarded !== null && o.marks_awarded !== undefined && (
              <p className="text-[11.5px] font-bold text-mint-600 tnum">
                {o.marks_awarded} / {o.marks_total} marks
              </p>
            )}
          </div>
          <Button as="a" size="sm" variant="mint" href={`/api/orders/${o.id}/file/checked`}
            icon={<Icon.Download size={14} />}>Download checked PDF</Button>
        </div>
      )}
    </Card>
  )
}

export default function Workspace() {
  const { user } = useAuth()
  const cat = useCatalog()
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')

  const load = () => api.get('/dashboard').then(setD).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])

  if (err) return <Alert tone="rose">{err}</Alert>
  if (!d) return <Loading label="Building your workspace" />

  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const who = firstName(user.name)

  return (
    <div className="a-rise">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-ink-900">
            {greet}, {who}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-500">Your active preparation hub.</p>
        </div>
        <Button as={Link} to="/app/discover" icon={<Icon.Search size={16} />}>Find a mentor</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.cards.map(c => <Stat key={c.label} {...c} />)}
      </div>

      {/* action required */}
      {d.awaiting_approval?.length > 0 && (
        <Card className="mt-6 !border-gold-300 !bg-gold-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-gold-600">
                <Icon.Scale size={19} />
              </span>
              <div>
                <p className="text-[14px] font-extrabold text-gold-900">
                  {d.awaiting_approval.length} order{d.awaiting_approval.length > 1 ? 's' : ''} waiting on your review
                </p>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-gold-800">
                  Approve to release payment immediately, or raise an issue. After{' '}
                  {cat.escrow_hours} hours the escrow releases on its own.
                </p>
              </div>
            </div>
            <Button as={Link} to="/app/orders" variant="gold" icon={<Icon.Chevron size={15} />}>
              Review now
            </Button>
          </div>
        </Card>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-7">
          {/* 5A */}
          <section>
            <SectionHead icon={<Icon.Video size={16} className="text-ink-400" />}
              hint="The join button unlocks five minutes before the session starts"
              action={<Button as={Link} to="/app/orders" size="sm" variant="ghost">All bookings</Button>}>
              Upcoming live sessions
            </SectionHead>
            {d.upcoming?.length ? (
              <div className="space-y-3">{d.upcoming.map(o => <SessionCard key={o.id} o={o} />)}</div>
            ) : (
              <Empty compact icon={<Icon.Calendar size={20} />} title="No live sessions booked"
                hint="Pick a mentor and book a 30-minute slot that fits your routine."
                action={<Button as={Link} to="/app/discover" size="sm">Browse mentors</Button>} />
            )}
          </section>

          {/* 5B */}
          <section>
            <SectionHead icon={<Icon.Pdf size={16} className="text-ink-400" />}
              hint="Every copy carries a guaranteed turnaround with an automatic refund">
              Copy evaluations in flight
            </SectionHead>
            {d.evaluations?.length ? (
              <div className="space-y-3">{d.evaluations.map(o => <EvalCard key={o.id} o={o} />)}</div>
            ) : (
              <Empty compact icon={<Icon.Pdf size={20} />} title="No copies with a mentor"
                hint="Upload a Mains answer or essay as a PDF and get it back annotated inside the SLA."
                action={<Button as={Link} to="/app/discover?service=offline_eval" size="sm" variant="outline">
                  Find an evaluator
                </Button>} />
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* 5C: credits */}
          <section>
            <SectionHead icon={<Icon.Package size={16} className="text-ink-400" />}>
              Active packages & credits
            </SectionHead>
            {d.retainers?.length ? (
              <div className="space-y-3">
                {d.retainers.map(r => (
                  <Card key={r.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-extrabold text-ink-900">{r.package_title}</p>
                        <p className="mt-0.5 text-[11.5px] text-ink-500">
                          {r.mentor?.name} · valid until {shortStamp(r.valid_until).split(',')[0]}
                        </p>
                      </div>
                      <Badge tone={r.days_left <= 5 ? 'gold' : 'mint'}>{r.days_left}d left</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {[['Session credits', r.session_credits_used, r.session_credits_total],
                        ['Evaluation credits', r.eval_credits_used, r.eval_credits_total]].map(([label, used, total]) => (
                        <div key={label}>
                          <div className="flex items-baseline justify-between text-[11.5px]">
                            <span className="font-bold text-ink-600">{label}</span>
                            <span className="font-extrabold text-ink-900 tnum">{total - used}/{total} left</span>
                          </div>
                          <Bar className="mt-1.5" value={total - used} max={total}
                            tone={total - used === 0 ? 'rose' : 'nex'} />
                        </div>
                      ))}
                    </div>
                    <Button as={Link} to={`/app/mentors/${r.mentor?.id}`} size="sm" variant="outline"
                      className="mt-4 w-full" icon={<Icon.Plus size={14} />}>
                      Redeem a credit
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty compact icon={<Icon.Package size={20} />} title="No active retainer"
                hint="A monthly bundle is the cheapest way to work with one mentor continuously." />
            )}
          </section>

          {/* 5D: chat */}
          <section>
            <SectionHead icon={<Icon.Chat size={16} className="text-ink-400" />}>
              Mentor chat
            </SectionHead>
            <Card>
              {d.unread_messages > 0 ? (
                <p className="text-[13px] font-bold text-ink-800">
                  You have {d.unread_messages} unread message{d.unread_messages > 1 ? 's' : ''}.
                </p>
              ) : (
                <p className="text-[13px] text-ink-600">
                  Follow-up questions, reading lists and copy feedback all live in one thread per mentor.
                </p>
              )}
              <Alert tone="ink" className="mt-3" icon={<Icon.Info size={15} />}>
                Mentors set their own schedules. Typical response time is 24–48 hours — this is
                for follow-ups, not real-time support.
              </Alert>
              <Button as={Link} to="/app/chat" variant="outline" size="sm" className="mt-3 w-full">
                Open conversations
              </Button>
            </Card>
          </section>

          <EscrowNote hours={cat.escrow_hours} />

          <Card pad="p-4">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
              Your benchmarking profile
            </p>
            <div className="mt-3 space-y-2 text-[12.5px]">
              {[
                ['Target year', d.profile?.target_year],
                ['Previous attempts', d.profile?.previous_attempts],
                ['Optional', d.profile?.optional_subject || 'Not decided'],
                ['Stage', (d.profile?.preparation_stages || []).length
                  ? d.profile.preparation_stages[d.profile.preparation_stages.length - 1] : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-ink-500">{k}</span>
                  <span className="text-right font-extrabold text-ink-900">{v ?? '—'}</span>
                </div>
              ))}
            </div>
            <Button as={Link} to="/app/profile" size="sm" variant="ghost" className="mt-3 w-full">
              Edit profile
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
