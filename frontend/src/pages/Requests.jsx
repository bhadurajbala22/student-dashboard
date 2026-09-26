import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, Button, Card, Empty, Field, Input, Loading, Modal, Textarea, toast,
} from '../components/ui'
import { fullStamp, inr, minutesLabel, relative } from '../format'
import { useCatalog } from '../meta'

export default function Requests() {
  const nav = useNavigate()
  const cat = useCatalog()
  const [rows, setRows] = useState(null)
  const [decision, setDecision] = useState(null)
  const [note, setNote] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => api.get('/orders?status=pending').then(d => setRows(d.results))
  useEffect(() => { load() }, [])

  const open = (order, action) => {
    setDecision({ order, action })
    setNote(action === 'confirm'
      ? `Confirmed. Please have your ${order.subject || 'notes'} and a blank sheet ready.`
      : '')
    setLink('')
  }

  const submit = async () => {
    setBusy(true)
    try {
      await api.post(`/orders/${decision.order.id}/${decision.action}`,
        { mentor_note: note, meeting_link: link })
      toast.success(decision.action === 'confirm'
        ? 'Confirmed — the aspirant has been notified'
        : 'Declined and refunded')
      setDecision(null)
      load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const chat = async (peerId) => {
    if (!peerId) return toast.error('This aspirant booked anonymously — reply in the session instead')
    try {
      const th = await api.post('/chat/threads', { peer_id: peerId })
      nav(`/app/chat/${th.id}`)
    } catch (e) { toast.error(e.message) }
  }

  if (!rows) return <Loading label="Loading requests" />

  return (
    <div className="a-rise">
      <div className="mb-5">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink-900">Class requests</h1>
        <p className="mt-1 text-[13.5px] text-ink-500">
          {rows.length} waiting on you. Confirming blocks the slot on your calendar; declining
          refunds the aspirant automatically.
        </p>
      </div>

      {rows.length === 0 ? (
        <Empty icon={<Icon.Check size={22} />} title="No pending requests"
          hint="Requests land here the moment someone books one of your published windows."
          action={<Button as={Link} to="/app/calendar" variant="outline" icon={<Icon.Calendar size={15} />}>
            Open more availability
          </Button>} />
      ) : (
        <div className="space-y-3">
          {rows.map(o => (
            <Card key={o.id} className="!border-gold-200">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar name={o.student?.name} initials={o.student?.initials} hue={o.student?.hue}
                  anonymous={o.student?.anonymous} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[15.5px] font-extrabold text-ink-900">{o.title}</h3>
                    <Badge tone="nex">{o.service_short}</Badge>
                    {o.is_anonymous && (
                      <Badge tone="dark" icon={<Icon.Incognito size={11} />}>Anonymous Mode</Badge>
                    )}
                    {o.paid_with_credit && <Badge tone="mint">Retainer credit</Badge>}
                  </div>
                  <p className="mt-1 text-[13px] text-ink-600">
                    <span className="font-extrabold text-ink-900">{o.student?.name}</span>
                    {o.student?.city ? ` · ${o.student.city}` : ''}
                    {o.subject ? ` · ${o.subject}` : ''}
                  </p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] font-bold text-ink-700">
                    {o.start_at && (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon.Calendar size={13} className="text-ink-400" />{fullStamp(o.start_at)}
                      </span>
                    )}
                    {o.duration_minutes > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon.Clock size={13} className="text-ink-400" />{minutesLabel(o.duration_minutes)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Icon.Wallet size={13} className="text-ink-400" />
                      {o.paid_with_credit ? 'Credit redemption' : `${inr(o.amount)} → you get ${inr(o.mentor_payout)}`}
                    </span>
                    <span className="text-gold-700">requested {relative(o.created_at)}</span>
                  </p>

                  {o.is_anonymous && (
                    <Alert className="mt-3" tone="dark" icon={<Icon.Incognito size={15} />}>
                      This aspirant hid their identity and benchmarking profile. Everything they
                      want you to know is in the agenda.
                    </Alert>
                  )}

                  {o.agenda && (
                    <div className="mt-3 rounded-2xl border border-ink-200 bg-ink-25 px-4 py-3">
                      <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                        Pre-session agenda
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-700">{o.agenda}</p>
                    </div>
                  )}

                  {o.has_upload && (
                    <a href={`/api/orders/${o.id}/file/submitted`} target="_blank" rel="noreferrer"
                      className="mt-2.5 inline-flex items-center gap-2 rounded-xl bg-ink-50 px-3.5 py-2.5 text-[12px] font-bold text-ink-700 transition hover:bg-ink-100">
                      <Icon.Pdf size={15} />{o.upload_name}
                      <span className="text-nex-600">open →</span>
                    </a>
                  )}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                  <Button variant="mint" onClick={() => open(o, 'confirm')} icon={<Icon.Check size={15} />}>
                    Confirm
                  </Button>
                  <Button variant="danger" onClick={() => open(o, 'decline')}>Decline</Button>
                  <Button variant="ghost" size="sm" onClick={() => chat(o.student?.id)}
                    icon={<Icon.Chat size={14} />}>Message</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!decision} onClose={() => setDecision(null)} width="max-w-md"
        title={decision?.action === 'confirm' ? 'Confirm this session' : 'Decline this request'}
        subtitle={decision ? `${decision.order.reference} · ${decision.order.start_at ? fullStamp(decision.order.start_at) : decision.order.title}` : ''}
        footer={<>
          <Button variant="ghost" onClick={() => setDecision(null)}>Back</Button>
          <Button loading={busy} onClick={submit}
            variant={decision?.action === 'confirm' ? 'mint' : 'danger'}>
            {decision?.action === 'confirm' ? 'Confirm session' : 'Decline & refund'}
          </Button>
        </>}>
        {decision?.action === 'confirm' ? (
          <div className="space-y-4">
            <Alert tone="mint" icon={<Icon.Check size={16} />}>
              The aspirant is notified immediately and the slot is blocked. Payment stays in escrow
              until you mark the session delivered and their {cat.escrow_hours}-hour window closes.
            </Alert>
            <Field label="Video room link" hint="Leave blank and the platform generates one.">
              <Input placeholder="https://meet.google.com/…" value={link}
                onChange={e => setLink(e.target.value)} />
            </Field>
            <Field label="Note to the aspirant" hint="What to prepare, what to bring, any pre-work.">
              <Textarea rows={4} value={note} onChange={e => setNote(e.target.value)} />
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert tone="gold" icon={<Icon.Info size={16} />}>
              Declining frees the slot and refunds them in full (or returns the retainer credit).
              A short reason helps them re-book sensibly.
            </Alert>
            <Field label="Reason (optional)">
              <Textarea rows={4} value={note} onChange={e => setNote(e.target.value)}
                placeholder="I'm travelling that week — could you take the Saturday 10 AM slot instead?" />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  )
}
