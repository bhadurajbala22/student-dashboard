import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { CATEGORY_META, OrderRow, SlaChip, StatusChip } from '../components/domain'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, Bar, Button, Card, Empty, Loading, Ring, SectionHead, Stars, Stat, toast,
} from '../components/ui'
import { countdown, firstName, fullStamp, inr, minutesLabel, relative, shortStamp } from '../format'
import { useCatalog } from '../meta'

export default function MentorHome() {
  const { user, profile, setProfile } = useAuth()
  const cat = useCatalog()
  const [d, setD] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = () => api.get('/dashboard').then(setD)
  useEffect(() => { load() }, [])

  const act = async (o, path) => {
    setBusy(o.id)
    try {
      await api.post(`/orders/${o.id}/${path}`, {})
      toast.success(path === 'confirm' ? 'Confirmed' : path === 'decline' ? 'Declined and refunded' : 'Done')
      load()
    } catch (e) { toast.error(e.message) } finally { setBusy(null) }
  }

  const toggleListing = async () => {
    try {
      setProfile(await api.post('/mentors/me/listing'))
      toast.success(profile.is_listed ? 'Your storefront is paused' : 'Your storefront is live')
    } catch (e) { toast.error(e.message) }
  }

  if (!d) return <Loading label="Building your dashboard" />

  const p = d.profile
  const meta = CATEGORY_META[p?.category] || CATEGORY_META.veteran
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const next = d.upcoming?.[0]
  const atRisk = (d.queue || []).filter(o => o.sla_hours_left !== null && o.sla_hours_left < 12)

  return (
    <div className="a-rise">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-ink-900">
            {greet}, {firstName(user.name)}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-500">Here is what needs you today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={p?.is_listed ? 'mint' : 'gold'}>
            {p?.is_listed ? 'Storefront live' : 'Storefront paused'}
          </Badge>
          <Button variant="outline" size="sm" onClick={toggleListing}>
            {p?.is_listed ? 'Pause listing' : 'Go live'}
          </Button>
        </div>
      </div>

      {!p?.is_listed && (
        <Alert className="mb-5" tone="gold" icon={<Icon.Alert size={16} />}
          title="You are hidden from discovery">
          Existing orders continue as normal, but new aspirants cannot find you while the listing
          is paused.
        </Alert>
      )}

      {atRisk.length > 0 && (
        <Card className="mb-5 !border-nex-200 !bg-nex-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-nex-600">
                <Icon.Clock size={19} />
              </span>
              <div>
                <p className="text-[14px] font-extrabold text-nex-900">
                  {atRisk.length} cop{atRisk.length === 1 ? 'y' : 'ies'} due within 12 hours
                </p>
                <p className="mt-0.5 text-[12.5px] text-nex-800">
                  Miss the SLA and the aspirant is refunded automatically — you are not paid for the work.
                </p>
              </div>
            </div>
            <Button as={Link} to="/app/queue" variant="danger" icon={<Icon.Chevron size={15} />}>
              Open the queue
            </Button>
          </div>
        </Card>
      )}

      {next && (
        <Card className="mb-6 !border-nex-900 !bg-nex-800">
          <div className="flex flex-wrap items-center gap-5">
            <div className="min-w-0 flex-1">
              <Badge tone="dark" className="!bg-white/15 !text-white" icon={<Icon.Clock size={11} />}>
                Next session {relative(next.start_at)}
              </Badge>
              <h3 className="mt-2.5 text-[20px] font-extrabold tracking-[-0.02em] text-white">
                {next.title}
              </h3>
              <p className="mt-1 flex items-center gap-2 text-[13px] text-nex-100/90">
                <Avatar name={next.student?.name} initials={next.student?.initials}
                  hue={next.student?.hue} anonymous={next.student?.anonymous} size={20} />
                {next.student?.name}
                {next.subject ? ` · ${next.subject}` : ''}
              </p>
              <p className="mt-2 text-[12.5px] font-semibold text-nex-100/80">
                {fullStamp(next.start_at)} · {minutesLabel(next.duration_minutes)} ·{' '}
                you receive {inr(next.mentor_payout)}
              </p>
            </div>
            <div className="flex gap-2">
              {next.meeting_link && (
                <Button as="a" href={next.meeting_link} target="_blank" rel="noreferrer"
                  variant="outline" className="!bg-white !text-nex-700 !ring-0 hover:!bg-nex-50" icon={<Icon.Video size={16} />}>
                  {next.join_open ? 'Start now' : 'Video room'}
                </Button>
              )}
              <Button as={Link} to="/app/orders" variant="glass">All orders</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {d.cards.map(c => <Stat key={c.label} {...c} />)}
      </div>

      {d.disputes?.length > 0 && (
        <Alert className="mt-5" tone="rose" icon={<Icon.Scale size={16} />}
          title={`${d.disputes.length} order${d.disputes.length > 1 ? 's' : ''} under dispute`}>
          Funds are frozen while our team reviews the vault recording or the returned copy. You
          don't need to do anything — we'll be in touch.{' '}
          <Link to="/app/orders" className="font-extrabold underline">See the orders →</Link>
        </Alert>
      )}

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-7">
          <section>
            <SectionHead icon={<Icon.Bell size={16} className="text-ink-400" />}
              hint="Aspirants waiting on your confirmation"
              action={d.pending?.length > 0 && (
                <Button as={Link} to="/app/requests" size="sm" variant="ghost">See all</Button>
              )}>
              Pending requests
            </SectionHead>
            {d.pending?.length ? (
              <div className="space-y-3">
                {d.pending.map(o => (
                  <Card key={o.id}>
                    <div className="flex flex-wrap items-start gap-4">
                      <Avatar name={o.student?.name} initials={o.student?.initials}
                        hue={o.student?.hue} anonymous={o.student?.anonymous} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[13.5px] font-extrabold text-ink-900">{o.title}</h4>
                          {o.is_anonymous && (
                            <Badge tone="dark" icon={<Icon.Incognito size={11} />} size="sm">Anonymous</Badge>
                          )}
                          {o.paid_with_credit && <Badge tone="mint" size="sm">Credit</Badge>}
                        </div>
                        <p className="mt-0.5 text-[12px] text-ink-500">
                          {o.student?.name} · {o.subject || o.service_short} ·{' '}
                          {o.start_at ? shortStamp(o.start_at) : relative(o.created_at)}
                        </p>
                        {o.agenda && (
                          <p className="mt-2 rounded-xl bg-ink-25 px-3.5 py-2.5 text-[12px] italic leading-relaxed text-ink-600">
                            “{o.agenda}”
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="mint" loading={busy === o.id}
                            onClick={() => act(o, 'confirm')} icon={<Icon.Check size={14} />}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="danger" disabled={busy === o.id}
                            onClick={() => act(o, 'decline')}>Decline</Button>
                          <span className="ml-auto text-right">
                            <span className="block text-[13px] font-extrabold text-ink-900 tnum">
                              {o.paid_with_credit ? 'Credit' : inr(o.amount)}
                            </span>
                            {!o.paid_with_credit && (
                              <span className="block text-[10.5px] font-semibold text-mint-600 tnum">
                                you get {inr(o.mentor_payout)}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Empty compact icon={<Icon.Check size={20} />} title="All caught up"
                hint="New requests show up here and in your notifications." />
            )}
          </section>

          <section>
            <SectionHead icon={<Icon.Pdf size={16} className="text-ink-400" />}
              hint="Ordered by how soon the SLA expires"
              action={d.queue?.length > 0 && (
                <Button as={Link} to="/app/queue" size="sm" variant="ghost">Open queue</Button>
              )}>
              Copy evaluation queue
            </SectionHead>
            {d.queue?.length ? (
              <div className="space-y-2.5">
                {d.queue.map(o => <OrderRow key={o.id} o={o} viewerRole="mentor" dense
                  onOpen={() => { window.location.href = '/app/queue' }} />)}
              </div>
            ) : (
              <Empty compact icon={<Icon.Pdf size={20} />} title="No copies waiting"
                hint={p?.max_daily_copies
                  ? `You accept up to ${p.max_daily_copies} answers a day.`
                  : 'Copy evaluation is switched off on your storefront.'} />
            )}
          </section>
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex items-start gap-3">
              <Avatar name={user.name} initials={user.initials} hue={user.hue} photo={user.photo} size={50} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[14px] font-extrabold text-ink-900">
                  {user.name}
                  {p?.is_verified && <Icon.Shield size={13} className="text-mint-600" />}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-bold text-ink-500">
                  <meta.icon size={12} />{meta.label}
                </p>
                <Stars value={p?.rating} count={p?.rating_count} size={12} />
              </div>
            </div>

            <div className="mt-4 space-y-2 border-t border-ink-100 pt-3.5 text-[12.5px]">
              {[
                ['Orders delivered', p?.orders_completed],
                ['Live windows', `${p?.slot_count || 0} / week`],
                ['Daily copy cap', p?.max_daily_copies || 'off'],
                ['Services on', p?.service_kinds?.length || 0],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="text-ink-500">{k}</span>
                  <span className="font-extrabold text-ink-900">{v}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button as={Link} to="/app/storefront" size="sm" variant="outline">Storefront</Button>
              <Button as={Link} to="/app/calendar" size="sm" variant="outline">Calendar</Button>
            </div>
          </Card>

          <Card>
            <SectionHead icon={<Icon.Wallet size={15} className="text-ink-400" />}>
              Escrow position
            </SectionHead>
            <div className="space-y-3">
              {[
                ['In escrow', d.balances?.in_escrow, 'gold', 'awaiting delivery or the review window'],
                ['Clearing in 24h', d.balances?.clearing_24h, 'nex', `${d.balances?.clearing_count || 0} orders`],
                ['Paid out', d.balances?.released, 'mint', 'lifetime, after platform fee'],
                ['Frozen', d.balances?.frozen, 'rose', 'held pending dispute review'],
              ].map(([label, value, tone, hint]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-[12.5px] font-bold text-ink-700">{label}</p>
                    <p className="text-[10.5px] text-ink-400">{hint}</p>
                  </div>
                  <p className={`shrink-0 text-[15px] font-extrabold tnum ${tone === 'mint' ? 'text-mint-600' : tone === 'rose' ? 'text-nex-600' : 'text-ink-900'}`}>
                    {inr(value || 0)}
                  </p>
                </div>
              ))}
            </div>
            <Button as={Link} to="/app/earnings" size="sm" variant="outline" className="mt-4 w-full">
              Full ledger
            </Button>
          </Card>

          {d.unread_messages > 0 && (
            <Alert tone="nex" icon={<Icon.Chat size={16} />}
              title={`${d.unread_messages} unread message${d.unread_messages > 1 ? 's' : ''}`}>
              <Link to="/app/chat" className="font-extrabold underline">Open conversations →</Link>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
