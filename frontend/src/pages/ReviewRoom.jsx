import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import CopyAnnotator, { COLORS, TOOLS } from '../components/CopyAnnotator'
import { SlaChip, StatusChip } from '../components/domain'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, Button, Card, Field, Input, Loading, Modal, Textarea, toast,
} from '../components/ui'
import { countdown, fullStamp, inr, relative } from '../format'

const SAVE_DEBOUNCE = 800
const LIVE_POLL = 2500

export default function ReviewRoom() {
  const { orderId } = useParams()
  const nav = useNavigate()
  const { user, isMentor } = useAuth()

  const [order, setOrder] = useState(null)
  const [marks, setMarks] = useState([])
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(COLORS[0])
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [saving, setSaving] = useState('idle')      // idle | saving | saved
  const [feedback, setFeedback] = useState('')
  const [awarded, setAwarded] = useState('')
  const [total, setTotal] = useState('')
  const [returning, setReturning] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sheet, setSheet] = useState(false)

  const saveTimer = useRef(null)
  const dirty = useRef(false)

  /* ── load ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    api.get(`/orders/${orderId}`).then(o => {
      setOrder(o)
      setMarks(o.annotations || [])
      setFeedback(o.evaluator_feedback || '')
      setAwarded(o.marks_awarded ?? '')
      setTotal(o.marks_total ?? '')
    }).catch(e => { toast.error(e.message); nav('/app/orders') })
  }, [orderId])

  const canMark = isMentor && order
    && ['submitted', 'evaluating', 'confirmed', 'delivered', 'ready'].includes(order.status)
  const isLive = order?.service_kind === 'live_eval'

  /* ── mentor: debounced autosave ───────────────────────────────────── */
  const persist = useCallback(async (next, extra = {}) => {
    setSaving('saving')
    try {
      await api.put(`/orders/${orderId}/annotations`, {
        annotations: next,
        evaluator_feedback: extra.feedback ?? feedback,
        marks_awarded: extra.awarded !== undefined
          ? (extra.awarded === '' ? null : Number(extra.awarded))
          : (awarded === '' ? null : Number(awarded)),
        marks_total: extra.total !== undefined
          ? (extra.total === '' ? null : Number(extra.total))
          : (total === '' ? null : Number(total)),
      })
      dirty.current = false
      setSaving('saved')
      setTimeout(() => setSaving(s => (s === 'saved' ? 'idle' : s)), 1600)
    } catch (e) { setSaving('idle'); toast.error(e.message) }
  }, [orderId, feedback, awarded, total])

  /* One debounced saver for both the drawing and the text fields. Blur alone
     is not enough — a mentor who types feedback and navigates away would
     otherwise lose it. */
  const schedule = useCallback((next, extra = {}) => {
    if (!canMark) return
    dirty.current = true
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => persist(next, extra), SAVE_DEBOUNCE)
  }, [canMark, persist])

  const onMarksChange = (next) => {
    setMarks(next)
    schedule(next)
  }

  const onField = (setter, key) => (e) => {
    const v = e.target.value
    setter(v)
    schedule(marks, { [key]: v })
  }

  // never lose marks on a refresh or tab close
  useEffect(() => {
    const warn = (e) => { if (dirty.current) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => { window.removeEventListener('beforeunload', warn); clearTimeout(saveTimer.current) }
  }, [])

  /* ── aspirant: poll so the mentor's marks appear as they are drawn ── */
  useEffect(() => {
    if (isMentor || !order) return
    const liveish = isLive || ['submitted', 'evaluating'].includes(order.status)
    if (!liveish) return
    const id = setInterval(() => {
      api.get(`/orders/${orderId}/annotations`).then(d => {
        setMarks(d.annotations || [])
        if (d.feedback) setFeedback(d.feedback)
      }).catch(() => {})
    }, LIVE_POLL)
    return () => clearInterval(id)
  }, [isMentor, order, isLive, orderId])

  const undo = () => onMarksChange(marks.slice(0, -1))
  const clearPage = () => onMarksChange(marks.filter(m => (m.page || 1) !== page))

  const returnCopy = async () => {
    setBusy(true)
    try {
      clearTimeout(saveTimer.current)
      await persist(marks)
      const fd = new FormData()
      fd.append('evaluator_feedback', feedback)
      fd.append('marks_awarded', awarded === '' ? '' : String(awarded))
      fd.append('marks_total', total === '' ? '' : String(total))
      await api.upload(`/orders/${orderId}/return`, fd)
      toast.success('Returned — the aspirant can see your marks now')
      setReturning(false)
      nav('/app/queue')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  if (!order) return <Loading label="Opening the review room" />

  const peer = isMentor ? order.student : order.mentor
  const filePath = `/orders/${order.id}/file/submitted`
  const marksOnPage = marks.filter(m => (m.page || 1) === page).length

  /* ── toolbar ──────────────────────────────────────────────────────── */
  const Toolbar = () => (
    /* One swipeable row on phones. The targets stay 44px — they are drawing
       tools used with a fingertip — so wrapping them would eat three rows of
       height above the copy; scrolling sideways keeps the page in view. */
    <div className="no-bar flex flex-nowrap items-center gap-1.5 overflow-x-auto lg:flex-wrap lg:overflow-x-visible">
      {TOOLS.map(t => (
        <button key={t.key} onClick={() => setTool(t.key)} title={t.hint}
          className={`focusable tap grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${tool === t.key
            ? 'bg-nex-600 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}`}>
          <t.icon size={18} />
        </button>
      ))}
      <span className="mx-1 h-8 w-px shrink-0 bg-ink-200" />
      {COLORS.map(c => (
        <button key={c} onClick={() => setColor(c)} aria-label={`Colour ${c}`}
          className={`focusable tap grid h-11 w-11 shrink-0 place-items-center rounded-xl transition ${color === c ? 'bg-ink-100' : 'hover:bg-ink-50'}`}>
          <span className="h-5 w-5 rounded-full ring-2 ring-white"
            style={{ background: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
        </button>
      ))}
      <span className="mx-1 h-8 w-px shrink-0 bg-ink-200" />
      <Button size="sm" variant="outline" className="shrink-0" onClick={undo} disabled={!marks.length}
        icon={<Icon.Refresh size={14} className="-scale-x-100" />}>Undo</Button>
      <Button size="sm" variant="ghost" className="shrink-0 whitespace-nowrap" onClick={clearPage}
        disabled={!marksOnPage}>
        Clear page
      </Button>
    </div>
  )

  return (
    /* The entrance animation puts a transform on its element, and a transformed
       element becomes the containing block for `position: fixed` children — which
       would re-anchor the mobile action bar to the page box instead of the viewport.
       So the bar and the sheets are siblings of the animated wrapper, not children. */
    <>
    <div className="a-rise">
      {/* ── header ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to={isMentor ? '/app/queue' : '/app/orders'}
            className="tap mb-2 inline-flex items-center gap-1.5 py-1 text-[13px] font-bold text-ink-500 hover:text-ink-900">
            <Icon.Chevron size={14} className="rotate-180" /> Back
          </Link>
          <h1 className="text-fluid-h3 font-extrabold tracking-[-0.03em] text-ink-900">
            {isLive ? 'Live copy review' : 'Copy review'}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={peer?.name} initials={peer?.initials} hue={peer?.hue}
                anonymous={peer?.anonymous} size={18} />
              <span className="font-bold text-ink-700">{peer?.name}</span>
            </span>
            {order.subject && <span>{order.subject}</span>}
            <span className="font-mono text-[11px] text-ink-400">{order.reference}</span>
            <StatusChip status={order.status} label={order.status_label} />
            {order.service_kind === 'offline_eval' && order.status !== 'approved' && (
              <SlaChip hours={order.sla_hours} breached={order.sla_breached}
                hoursLeft={order.sla_hours_left} />
            )}
          </p>
        </div>

        {/* On phones the save state and Return live in the sticky bar at the
            bottom, so this row would only repeat them above the copy. */}
        <div className="hidden flex-wrap items-center gap-2 lg:flex">
          {canMark && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-extrabold ${saving === 'saving' ? 'bg-ink-100 text-ink-600'
              : saving === 'saved' ? 'bg-mint-50 text-mint-700' : 'bg-ink-50 text-ink-400'}`}>
              {saving === 'saving' ? <><Icon.Refresh size={12} className="animate-spin" />Saving…</>
                : saving === 'saved' ? <><Icon.Check size={12} />Saved</>
                  : <>{marks.length} mark{marks.length === 1 ? '' : 's'}</>}
            </span>
          )}
          {isLive && order.meeting_link && (
            <Button as="a" href={order.meeting_link} target="_blank" rel="noreferrer"
              variant={order.join_open ? 'mint' : 'outline'} icon={<Icon.Video size={15} />}>
              {order.join_open ? 'Join call' : 'Video room'}
            </Button>
          )}
          {canMark && order.service_kind === 'offline_eval'
            && ['submitted', 'evaluating'].includes(order.status) && (
            <Button onClick={() => setReturning(true)} icon={<Icon.Send size={15} />}>
              Return to aspirant
            </Button>
          )}
        </div>
      </div>

      {isLive && (
        <Alert className="mb-4" tone="nex" icon={<Icon.Board size={16} />}
          title={isMentor ? 'Shared live review' : 'Your mentor is marking this copy'}>
          {isMentor
            ? 'Open the video room alongside this. Everything you draw appears on the aspirant’s screen within a couple of seconds — no need to share your screen.'
            : 'Marks appear here as your mentor draws them. Keep the video room open in the other tab and follow along.'}
        </Alert>
      )}

      {!isMentor && ['submitted', 'evaluating'].includes(order.status) && !isLive && (
        <Alert className="mb-4" tone="gold" icon={<Icon.Clock size={16} />}>
          Your mentor hasn't returned this yet. Anything they've already marked shows below and
          updates on its own.
        </Alert>
      )}

      {/* ── toolbar + copy ─────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {canMark && (
            <div className="sticky top-16 z-20 mb-3 rounded-2xl border border-ink-200 bg-white/95 p-2.5 backdrop-blur-xl">
              <Toolbar />
            </div>
          )}
          <Card pad="p-3" className="!bg-ink-50">
            <CopyAnnotator
              filePath={filePath}
              value={marks}
              onChange={onMarksChange}
              readOnly={!canMark}
              tool={tool}
              color={color}
              page={page}
              onPageChange={setPage}
              onPageCount={setPageCount}
              liveHint={!isMentor && (isLive || order.status === 'evaluating') ? 'Live' : ''}
            />
          </Card>
          {!canMark && marks.length === 0 && (
            <p className="mt-3 text-center text-[12.5px] text-ink-400">
              No marks on this copy yet.
            </p>
          )}
        </div>

        {/* ── side panel ───────────────────────────────────────────── */}
        <div className="hidden space-y-4 lg:block">
          <Card>
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
              {canMark ? 'Your evaluation' : 'Evaluation'}
            </p>
            {canMark ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <Field label="Marks">
                    <Input type="number" step="0.5" placeholder="11" value={awarded}
                      onChange={onField(setAwarded, 'awarded')} />
                  </Field>
                  <Field label="Out of">
                    <Input type="number" step="0.5" placeholder="15" value={total}
                      onChange={onField(setTotal, 'total')} />
                  </Field>
                </div>
                <Field label="Summary feedback"
                  hint="The headline fix. Detail goes in the margin notes.">
                  <Textarea rows={6} value={feedback}
                    onChange={onField(setFeedback, 'feedback')}
                    placeholder="Claim in line two, always. Add the 41% devolution figure and Article 293(3)." />
                </Field>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {order.marks_awarded !== null && order.marks_awarded !== undefined ? (
                  <p className="text-[24px] font-extrabold text-ink-900 tnum">
                    {order.marks_awarded} <span className="text-[14px] text-ink-400">/ {order.marks_total}</span>
                  </p>
                ) : <p className="text-[12.5px] text-ink-400">Not marked yet.</p>}
                {feedback && (
                  <p className="rounded-xl bg-ink-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-700">
                    {feedback}
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card pad="p-4">
            <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
              Marks on this copy
            </p>
            <div className="mt-3 space-y-1.5 text-[12.5px]">
              {TOOLS.filter(t => t.key !== 'erase').map(t => {
                const n = marks.filter(m => m.kind === t.key).length
                return (
                  <div key={t.key} className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 text-ink-600">
                      <t.icon size={13} className="text-ink-400" />{t.label}
                    </span>
                    <span className="font-extrabold text-ink-900 tnum">{n}</span>
                  </div>
                )
              })}
              <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-2">
                <span className="font-bold text-ink-700">Pages</span>
                <span className="font-extrabold text-ink-900 tnum">{pageCount}</span>
              </div>
            </div>
          </Card>

          {order.agenda && (
            <Card pad="p-4">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
                What they asked for
              </p>
              <p className="mt-2 text-[12.5px] italic leading-relaxed text-ink-600">
                “{order.agenda}”
              </p>
            </Card>
          )}
        </div>
      </div>

    </div>

      {/* ── mobile: evaluation in a sheet ──────────────────────────── */}
      <div className="fixed inset-x-0 bottom-[3.4rem] z-30 border-t border-ink-200 bg-white/95 px-4 py-2.5 pb-safe backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-ink-600">
            {marks.length} mark{marks.length === 1 ? '' : 's'}
            {order.marks_awarded != null && ` · ${order.marks_awarded}/${order.marks_total}`}
          </span>
          <Button size="sm" variant="outline" onClick={() => setSheet(true)}>
            {canMark ? 'Marks & feedback' : 'Feedback'}
          </Button>
          {canMark && order.service_kind === 'offline_eval'
            && ['submitted', 'evaluating'].includes(order.status) && (
            <Button size="sm" onClick={() => setReturning(true)}>Return</Button>
          )}
        </div>
      </div>

      <Modal open={sheet} onClose={() => setSheet(false)} width="max-w-md"
        title={canMark ? 'Marks & feedback' : 'Your evaluation'}
        footer={<Button onClick={() => { if (canMark) persist(marks); setSheet(false) }}>Done</Button>}>
        {canMark ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Marks">
                <Input type="number" step="0.5" value={awarded}
                  onChange={onField(setAwarded, 'awarded')} />
              </Field>
              <Field label="Out of">
                <Input type="number" step="0.5" value={total}
                  onChange={onField(setTotal, 'total')} />
              </Field>
            </div>
            <Field label="Summary feedback">
              <Textarea rows={6} value={feedback} onChange={onField(setFeedback, 'feedback')} />
            </Field>
          </div>
        ) : (
          <div className="space-y-3">
            {order.marks_awarded != null && (
              <p className="text-[26px] font-extrabold text-ink-900 tnum">
                {order.marks_awarded} <span className="text-[15px] text-ink-400">/ {order.marks_total}</span>
              </p>
            )}
            <p className="text-[13px] leading-relaxed text-ink-700">
              {feedback || 'No summary feedback yet.'}
            </p>
          </div>
        )}
      </Modal>

      {/* ── return confirmation ────────────────────────────────────── */}
      <Modal open={returning} onClose={() => setReturning(false)} width="max-w-md"
        title="Return the marked copy"
        subtitle={`${order.reference} · ${marks.length} mark${marks.length === 1 ? '' : 's'}`}
        footer={<>
          <Button variant="ghost" onClick={() => setReturning(false)}>Keep marking</Button>
          <Button loading={busy} onClick={returnCopy} icon={<Icon.Send size={15} />}>
            Return to aspirant
          </Button>
        </>}>
        <div className="space-y-4">
          {order.sla_hours_left != null && (
            <Alert tone={order.sla_hours_left < 6 ? 'nex' : 'gold'} icon={<Icon.Clock size={16} />}>
              {order.sla_hours_left > 0
                ? `${countdown(order.sla_hours_left)} left of your ${order.sla_hours}-hour SLA.`
                : 'This order is already past its SLA.'}
            </Alert>
          )}
          {marks.length === 0 && (
            <Alert tone="nex" icon={<Icon.Alert size={16} />}>
              You haven't marked anything yet. Add at least one mark before returning.
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marks awarded">
              <Input type="number" step="0.5" value={awarded}
                onChange={onField(setAwarded, 'awarded')} />
            </Field>
            <Field label="Out of">
              <Input type="number" step="0.5" value={total}
                onChange={onField(setTotal, 'total')} />
            </Field>
          </div>
          <Field label="Summary feedback">
            <Textarea rows={4} value={feedback} onChange={onField(setFeedback, 'feedback')} />
          </Field>
          <p className="text-[11.5px] leading-relaxed text-ink-500">
            The aspirant gets an email immediately and can open this copy with all your marks.
            Payment stays in escrow until they approve or the 72-hour window closes.
          </p>
        </div>
      </Modal>
    </>
  )
}
