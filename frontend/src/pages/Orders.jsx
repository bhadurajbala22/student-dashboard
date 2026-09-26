import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import {
  EscrowChip, EscrowNote, OrderRow, SERVICE_ICON, SERVICE_NAME, SlaChip, StatusChip,
} from '../components/domain'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, Bar, Button, Card, Drawer, Empty, Field, Input, Loading, Modal,
  SectionHead, Segmented, Select, Stars, Textarea, toast,
} from '../components/ui'
import { countdown, fullStamp, inr, minutesLabel, relative } from '../format'
import { useCatalog } from '../meta'

export default function Orders() {
  const { user, isMentor } = useAuth()
  const cat = useCatalog()
  const nav = useNavigate()
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('open')
  const [kind, setKind] = useState('')
  const [open, setOpen] = useState(null)
  const [busy, setBusy] = useState(false)

  // sub-dialogs
  const [dispute, setDispute] = useState(null)
  const [disputeForm, setDisputeForm] = useState({ reason: '', detail: '' })
  const [review, setReview] = useState(null)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [ret, setRet] = useState(null)
  const [retForm, setRetForm] = useState({ feedback: '', awarded: '', total: '', file: null })
  const fileRef = useRef(null)

  const load = async () => {
    const d = await api.get('/orders')
    setRows(d.results)
    if (open) setOpen(d.results.find(o => o.id === open.id) || null)
  }
  useEffect(() => { load() }, [])

  const buckets = useMemo(() => {
    const all = rows || []
    const f = (list) => kind ? list.filter(o => o.service_kind === kind) : list
    return {
      open: f(all.filter(o => ['pending', 'confirmed', 'submitted', 'evaluating', 'ready',
        'delivered', 'active'].includes(o.status))),
      action: f(all.filter(o => isMentor
        ? ['pending', 'submitted', 'evaluating', 'confirmed'].includes(o.status)
        : ['delivered', 'ready'].includes(o.status))),
      done: f(all.filter(o => ['approved', 'expired'].includes(o.status))),
      issues: f(all.filter(o => ['disputed', 'refunded_sla', 'declined', 'cancelled'].includes(o.status))),
      all: f(all),
    }
  }, [rows, kind, isMentor])

  const act = async (o, path, body) => {
    setBusy(true)
    try {
      await api.post(`/orders/${o.id}/${path}`, body ?? {})
      toast.success({
        confirm: 'Confirmed — the aspirant has been notified',
        decline: 'Request declined and refunded',
        cancel: 'Cancelled and refunded',
        deliver: 'Marked delivered — escrow clock started',
        'start-evaluation': 'Marked as evaluating',
        approve: 'Payment released to the mentor',
      }[path] || 'Done')
      await load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const submitDispute = async () => {
    if (!disputeForm.reason) return toast.error('Pick a reason')
    setBusy(true)
    try {
      await api.post(`/orders/${dispute.id}/dispute`, disputeForm)
      toast.success('Dispute submitted — the escrow is frozen')
      setDispute(null); setDisputeForm({ reason: '', detail: '' })
      await load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const submitReview = async () => {
    setBusy(true)
    try {
      await api.post(`/orders/${review.id}/review`, reviewForm)
      toast.success('Review posted')
      setReview(null); setReviewForm({ rating: 5, comment: '' })
      await load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const submitReturn = async () => {
    if (!retForm.file) return toast.error('Attach the checked PDF')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('evaluator_feedback', retForm.feedback)
      fd.append('marks_awarded', retForm.awarded)
      fd.append('marks_total', retForm.total)
      fd.append('file', retForm.file)
      await api.upload(`/orders/${ret.id}/return`, fd)
      toast.success('Returned — the aspirant can download it now')
      setRet(null); setRetForm({ feedback: '', awarded: '', total: '', file: null })
      await load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const openChat = async (peerId) => {
    try {
      const th = await api.post('/chat/threads', { peer_id: peerId })
      nav(`/app/chat/${th.id}`)
    } catch (e) { toast.error(e.message) }
  }

  if (!rows) return <Loading label="Loading your orders" />

  const list = buckets[tab]
  const o = open
  const peer = o ? (isMentor ? o.student : o.mentor) : null

  return (
    <div className="a-rise">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-ink-900">
            {isMentor ? 'All orders' : 'My bookings'}
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-500">
            {buckets.all.length} total · {buckets.action.length} need attention · all times IST
          </p>
        </div>
        {!isMentor && (
          <Button as={Link} to="/app/discover" icon={<Icon.Plus size={16} />}>Book something new</Button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <Segmented value={tab} onChange={setTab} options={[
          { value: 'action', label: 'Needs you', count: buckets.action.length },
          { value: 'open', label: 'Open', count: buckets.open.length },
          { value: 'done', label: 'Completed', count: buckets.done.length },
          { value: 'issues', label: 'Issues', count: buckets.issues.length },
          { value: 'all', label: 'All', count: buckets.all.length },
        ]} />
        <Select className="!w-auto" value={kind} onChange={e => setKind(e.target.value)}
          placeholder="All services"
          options={Object.entries(cat.services || {}).map(([k, v]) => ({ value: k, label: v.short }))} />
      </div>

      {list.length === 0 ? (
        <Empty icon={<Icon.Package size={22} />}
          title={tab === 'action' ? 'Nothing needs your attention' : `No ${tab === 'all' ? '' : tab} orders`}
          hint={isMentor
            ? 'New requests and copies land here the moment an aspirant books.'
            : 'Browse mentors and book a session, a copy evaluation or a monthly retainer.'}
          action={!isMentor && <Button as={Link} to="/app/discover">Find a mentor</Button>} />
      ) : (
        <div className="space-y-2.5">
          {list.map(row => (
            <OrderRow key={row.id} o={row} viewerRole={user.role} onOpen={setOpen} />
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════ detail drawer */}
      <Drawer open={!!o} onClose={() => setOpen(null)}
        title={o?.title} subtitle={o ? `${o.reference} · ${o.service_label}` : ''}
        footer={o && (
          <>
            <Button variant="ghost" size="sm" onClick={() => openChat(peer?.id)}
              disabled={!peer?.id} icon={<Icon.Chat size={14} />}>Message</Button>

            {/* ---- mentor actions ---- */}
            {isMentor && o.status === 'pending' && (
              <>
                <Button variant="danger" size="sm" loading={busy}
                  onClick={() => act(o, 'decline')}>Decline</Button>
                <Button variant="mint" size="sm" loading={busy}
                  onClick={() => act(o, 'confirm')} icon={<Icon.Check size={14} />}>Confirm</Button>
              </>
            )}
            {isMentor && o.status === 'confirmed' && (
              <Button size="sm" loading={busy} onClick={() => act(o, 'deliver')}
                icon={<Icon.Check size={14} />}>Mark delivered</Button>
            )}
            {isMentor && o.service_kind === 'offline_eval' && o.status === 'submitted' && (
              <Button variant="outline" size="sm" loading={busy}
                onClick={() => act(o, 'start-evaluation')}>Start evaluating</Button>
            )}
            {o.has_upload && ['offline_eval', 'live_eval'].includes(o.service_kind) && (
              <Button as={Link} to={`/app/review/${o.id}`} size="sm"
                variant={isMentor && ['submitted', 'evaluating'].includes(o.status) ? 'primary' : 'outline'}
                icon={<Icon.Pencil size={14} />}>
                {isMentor && ['submitted', 'evaluating'].includes(o.status)
                  ? 'Open & mark'
                  : o.annotation_count > 0 ? `View ${o.annotation_count} marks` : 'Open copy'}
              </Button>
            )}

            {/* ---- student actions ---- */}
            {!isMentor && ['delivered', 'ready'].includes(o.status) && (
              <>
                {o.can_dispute && (
                  <Button variant="danger" size="sm" onClick={() => setDispute(o)}
                    icon={<Icon.Alert size={14} />}>Raise an issue</Button>
                )}
                <Button variant="mint" size="sm" loading={busy} onClick={() => act(o, 'approve')}
                  icon={<Icon.Check size={14} />}>Approve & release</Button>
              </>
            )}
            {!isMentor && !o.review && ['delivered', 'ready', 'approved'].includes(o.status) && (
              <Button variant="outline" size="sm" onClick={() => setReview(o)}
                icon={<Icon.Star size={14} />}>Rate</Button>
            )}
            {['pending', 'confirmed'].includes(o.status) && (
              <Button variant="ghost" size="sm" loading={busy} onClick={() => act(o, 'cancel')}>
                Cancel
              </Button>
            )}
          </>
        )}>
        {o && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip status={o.status} label={o.status_label} />
              <EscrowChip state={o.escrow_state} hours={o.hours_to_release} />
              {o.is_anonymous && (
                <Badge tone="dark" icon={<Icon.Incognito size={11} />}>Anonymous Mode</Badge>
              )}
              {o.paid_with_credit && <Badge tone="mint">Retainer credit</Badge>}
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-ink-25 p-4">
              <Avatar name={peer?.name} initials={peer?.initials} hue={peer?.hue}
                anonymous={peer?.anonymous} size={44} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-extrabold text-ink-900">{peer?.name}</p>
                <p className="text-[11.5px] text-ink-500">
                  {peer?.anonymous ? 'Identity hidden for this order'
                    : isMentor ? 'Aspirant' : 'Mentor'}{peer?.city ? ` · ${peer.city}` : ''}
                </p>
              </div>
              {!isMentor && peer?.id && (
                <Button as={Link} to={`/app/mentors/${peer.id}`} size="xs" variant="outline">
                  Storefront
                </Button>
              )}
            </div>

            {o.is_anonymous && isMentor && (
              <Alert tone="dark" icon={<Icon.Incognito size={16} />} title="Anonymous booking">
                This aspirant chose to hide their identity and benchmarking profile. Everything you
                need should be in the agenda below. Treat the session as confidential.
              </Alert>
            )}

            {/* scheduled */}
            {o.start_at && (
              <div className="rounded-2xl border border-ink-200 p-4">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                  Session
                </p>
                <p className="mt-1.5 text-[14px] font-extrabold text-ink-900">{fullStamp(o.start_at)}</p>
                <p className="text-[12px] text-ink-500">
                  {minutesLabel(o.duration_minutes)}
                  {o.minutes_to_start > 0 ? ` · starts ${relative(o.start_at)}` : ''}
                </p>
                {o.meeting_link && ['confirmed', 'delivered', 'approved'].includes(o.status) && (
                  <Button as="a" href={o.meeting_link} target="_blank" rel="noreferrer"
                    size="sm" variant={o.join_open ? 'mint' : 'outline'} className="mt-3"
                    icon={<Icon.Video size={14} />}>
                    {o.join_open ? 'Join now' : 'Video room link'}
                  </Button>
                )}
              </div>
            )}

            {/* offline eval */}
            {o.service_kind === 'offline_eval' && (
              <div className="rounded-2xl border border-ink-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                    Copy evaluation · {o.quantity} answer{o.quantity > 1 ? 's' : ''}
                  </p>
                  <SlaChip hours={o.sla_hours} breached={o.sla_breached} hoursLeft={o.sla_hours_left} />
                </div>
                {o.sla_hours_left !== null && o.status !== 'approved' && (
                  <Bar className="mt-3" value={Math.max(0, o.sla_hours_left)} max={o.sla_hours}
                    tone={o.sla_hours_left < 6 ? 'rose' : o.sla_hours_left < 18 ? 'gold' : 'mint'} />
                )}
                <div className="mt-3.5 space-y-2">
                  {o.has_upload && (
                    <a href={`/api/orders/${o.id}/file/submitted`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl bg-ink-50 px-3.5 py-2.5 transition hover:bg-ink-100">
                      <Icon.Pdf size={16} className="shrink-0 text-ink-500" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink-800">
                        {o.upload_name}
                      </span>
                      <span className="shrink-0 text-[11px] font-extrabold text-nex-600">Submitted copy →</span>
                    </a>
                  )}
                  {o.annotation_count > 0 && (
                    <Link to={`/app/review/${o.id}`}
                      className="flex items-center gap-3 rounded-xl bg-nex-50 px-3.5 py-2.5 transition hover:bg-nex-100">
                      <Icon.Pencil size={16} className="shrink-0 text-nex-600" />
                      <span className="min-w-0 flex-1 text-[12.5px] font-bold text-nex-900">
                        {o.annotation_count} mark{o.annotation_count === 1 ? '' : 's'} on the copy
                      </span>
                      <span className="shrink-0 text-[11px] font-extrabold text-nex-700">Open →</span>
                    </Link>
                  )}
                  {o.has_return && (
                    <a href={`/api/orders/${o.id}/file/checked`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl bg-mint-50 px-3.5 py-2.5 transition hover:bg-mint-100">
                      <Icon.Pdf size={16} className="shrink-0 text-mint-600" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-mint-700">
                        {o.returned_name}
                      </span>
                      <span className="shrink-0 text-[11px] font-extrabold text-mint-700">Checked copy →</span>
                    </a>
                  )}
                </div>
                {o.marks_awarded !== null && o.marks_awarded !== undefined && (
                  <p className="mt-3 text-[13px] font-extrabold text-ink-900 tnum">
                    Marks: {o.marks_awarded} / {o.marks_total}
                  </p>
                )}
                {o.evaluator_feedback && (
                  <p className="mt-2.5 rounded-xl bg-ink-25 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-700">
                    {o.evaluator_feedback}
                  </p>
                )}
              </div>
            )}

            {/* retainer */}
            {o.service_kind === 'retainer' && (
              <div className="rounded-2xl border border-mint-200 bg-mint-50 p-4">
                <p className="text-[13.5px] font-extrabold text-mint-700">{o.package_title}</p>
                <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-mint-700">
                  {o.deliverables}
                </p>
                <div className="mt-3.5 space-y-3">
                  {[['Session credits', o.session_credits_used, o.session_credits_total],
                    ['Evaluation credits', o.eval_credits_used, o.eval_credits_total]].map(([l, used, total]) => (
                    <div key={l}>
                      <div className="flex items-baseline justify-between text-[11.5px]">
                        <span className="font-bold text-mint-700">{l}</span>
                        <span className="font-extrabold text-mint-700 tnum">{total - used}/{total} left</span>
                      </div>
                      <Bar className="mt-1.5" value={total - used} max={total} tone="mint" />
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11.5px] font-semibold text-mint-600">
                  {o.days_left} day{o.days_left === 1 ? '' : 's'} of validity left
                  {o.days_left <= 5 && ' — unused credits liquidate at expiry'}
                </p>
              </div>
            )}

            {o.agenda && (
              <div>
                <p className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                  {isMentor ? "Aspirant's agenda" : 'Your agenda'}
                </p>
                <p className="rounded-2xl bg-ink-25 px-4 py-3 text-[12.5px] italic leading-relaxed text-ink-700">
                  “{o.agenda}”
                </p>
              </div>
            )}

            {o.mentor_note && (
              <div>
                <p className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                  Mentor's note
                </p>
                <p className="rounded-2xl bg-nex-50 px-4 py-3 text-[12.5px] leading-relaxed text-nex-900">
                  {o.mentor_note}
                </p>
              </div>
            )}

            {/* money */}
            <div className="rounded-2xl bg-nex-800 p-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-white/65">
                Payment
              </p>
              <div className="mt-3 space-y-2 text-[12.5px]">
                <div className="flex justify-between text-white/75">
                  <span>{o.paid_with_credit ? 'Paid with credit' : 'Order value'}</span>
                  <span className="tnum">{o.paid_with_credit ? '—' : inr(o.amount)}</span>
                </div>
                {isMentor && !o.paid_with_credit && (
                  <>
                    <div className="flex justify-between text-white/75">
                      <span>Platform fee ({Math.round(cat.commission_rate * 100)}%)</span>
                      <span className="tnum">− {inr(o.commission_amount)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2">
                      <span className="font-extrabold text-white">Your payout</span>
                      <span className="text-[17px] font-extrabold text-white tnum">{inr(o.mentor_payout)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-3.5 flex items-center gap-2 border-t border-white/10 pt-3">
                <Icon.Lock size={14} className="shrink-0 text-white/60" />
                <p className="text-[11px] leading-snug text-white/70">
                  {o.escrow_state === 'held' && o.hours_to_release > 0
                    ? `Held in escrow — releases automatically in ${countdown(o.hours_to_release)} unless an issue is raised.`
                    : o.escrow_state === 'held' ? 'Held in escrow until the service is delivered.'
                      : o.escrow_state === 'released' ? `Released to the mentor ${relative(o.released_at)}.`
                        : o.escrow_state === 'refunded' ? 'Refunded in full.'
                          : o.escrow_state === 'frozen' ? 'Frozen pending dispute review.'
                            : 'Liquidated under the credit-expiry rule.'}
                </p>
              </div>
            </div>

            {o.dispute && (
              <Alert tone="rose" icon={<Icon.Scale size={16} />}
                title={`Dispute · ${o.dispute.status}`}>
                <p className="font-bold">{o.dispute.reason}</p>
                {o.dispute.detail && <p className="mt-1">{o.dispute.detail}</p>}
                <p className="mt-1.5 text-[11px]">Raised {relative(o.dispute.created_at)}</p>
                {o.dispute.resolution_note && (
                  <p className="mt-1.5 font-semibold">Outcome: {o.dispute.resolution_note}</p>
                )}
              </Alert>
            )}

            {o.review && (
              <div className="rounded-2xl border border-ink-200 p-4">
                <p className="mb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                  Review
                </p>
                <Stars value={o.review.rating} size={13} />
                {o.review.comment && (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">“{o.review.comment}”</p>
                )}
              </div>
            )}

            {o.recordings?.length > 0 && (
              <Button as={Link} to="/app/vault" variant="outline" size="sm" className="w-full"
                icon={<Icon.Video size={14} />}>
                {o.recordings.length} recording{o.recordings.length > 1 ? 's' : ''} in the vault
              </Button>
            )}
          </div>
        )}
      </Drawer>

      {/* ═══════════════════════════════ dispute (student screen 6B) */}
      <Modal open={!!dispute} onClose={() => setDispute(null)} width="max-w-md"
        title="Raise an issue" subtitle={dispute ? `${dispute.reference} · ${dispute.title}` : ''}
        footer={<>
          <Button variant="ghost" onClick={() => setDispute(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={submitDispute}
            icon={<Icon.Alert size={15} />}>Submit to platform admin</Button>
        </>}>
        <div className="space-y-4">
          <Alert tone="gold" icon={<Icon.Clock size={16} />}>
            You have {cat.escrow_hours} hours from delivery to report a problem. Submitting freezes
            the escrow immediately — the mentor is not paid until our team reviews the session
            recording or the returned copy.
          </Alert>
          <Field label="Reason for dispute" required>
            <Select value={disputeForm.reason} placeholder="Select a reason"
              options={cat.dispute_reasons}
              onChange={e => setDisputeForm(f => ({ ...f, reason: e.target.value }))} />
          </Field>
          <Field label="Explain the issue"
            hint="Be specific — timestamps, what was missing, what you expected.">
            <Textarea rows={5} value={disputeForm.detail}
              onChange={e => setDisputeForm(f => ({ ...f, detail: e.target.value }))}
              placeholder="I waited in the video room for 25 minutes and messaged twice. The session never started." />
          </Field>
        </div>
      </Modal>

      {/* ═════════════════════════════════════════════════ review */}
      <Modal open={!!review} onClose={() => setReview(null)} width="max-w-md"
        title="Rate this order" subtitle={review ? `${review.title} · ${review.mentor?.name}` : ''}
        footer={<>
          <Button variant="ghost" onClick={() => setReview(null)}>Cancel</Button>
          <Button loading={busy} onClick={submitReview}>Post review</Button>
        </>}>
        <div className="text-center">
          <Stars value={reviewForm.rating} onRate={v => setReviewForm(f => ({ ...f, rating: v }))} />
          <p className="mt-2 text-[12.5px] font-semibold text-ink-500">
            {['', 'Not useful', 'Below expectations', 'Fine', 'Very good', 'Excellent'][reviewForm.rating]}
          </p>
        </div>
        <Textarea className="mt-5" rows={4} value={reviewForm.comment}
          onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
          placeholder="What worked, what could be better? This appears on their public profile." />
      </Modal>

      {/* ═════════════════════════ mentor: return the checked copy */}
      <Modal open={!!ret} onClose={() => setRet(null)} width="max-w-md"
        title="Return the checked copy" subtitle={ret ? `${ret.reference} · ${ret.quantity} answer(s)` : ''}
        footer={<>
          <Button variant="ghost" onClick={() => setRet(null)}>Cancel</Button>
          <Button loading={busy} onClick={submitReturn} icon={<Icon.Upload size={15} />}>
            Return to aspirant
          </Button>
        </>}>
        <div className="space-y-4">
          {ret?.sla_hours_left !== null && ret?.sla_hours_left !== undefined && (
            <Alert tone={ret.sla_hours_left < 6 ? 'rose' : 'gold'} icon={<Icon.Clock size={16} />}>
              {ret.sla_hours_left > 0
                ? `${countdown(ret.sla_hours_left)} left of your ${ret.sla_hours}-hour SLA.`
                : 'This order is already past its SLA and has been refunded.'}
            </Alert>
          )}
          <Field label="Checked PDF" required hint="The annotated copy · PDF only, max 10 MB">
            <button type="button" onClick={() => fileRef.current?.click()}
              className={`focusable flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-3.5 text-left transition ${retForm.file ? 'border-mint-300 bg-mint-50' : 'border-ink-300 hover:border-nex-400'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${retForm.file ? 'bg-mint-100 text-mint-600' : 'bg-ink-100 text-ink-500'}`}>
                {retForm.file ? <Icon.Pdf size={18} /> : <Icon.Upload size={18} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-bold text-ink-800">
                  {retForm.file ? retForm.file.name : 'Choose the checked PDF'}
                </span>
                <span className="block text-[11px] text-ink-500">
                  {retForm.file ? `${(retForm.file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF only'}
                </span>
              </span>
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
              onChange={e => setRetForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marks awarded">
              <Input type="number" step="0.5" placeholder="11" value={retForm.awarded}
                onChange={e => setRetForm(f => ({ ...f, awarded: e.target.value }))} />
            </Field>
            <Field label="Out of">
              <Input type="number" step="0.5" placeholder="15" value={retForm.total}
                onChange={e => setRetForm(f => ({ ...f, total: e.target.value }))} />
            </Field>
          </div>
          <Field label="Summary feedback" hint="The headline fix. Detail goes in the PDF margins.">
            <Textarea rows={4} value={retForm.feedback}
              onChange={e => setRetForm(f => ({ ...f, feedback: e.target.value }))}
              placeholder="Claim in line two, always. Add the 41% devolution figure and Article 293(3). Rewrite and resend by Friday." />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
