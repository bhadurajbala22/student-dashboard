import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { SlaChip, StatusChip } from '../components/domain'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, Bar, Button, Card, Empty, Field, Input, Loading, Modal, SectionHead,
  Segmented, Textarea, toast,
} from '../components/ui'
import { countdown, inr, relative, shortStamp } from '../format'
import { useCatalog } from '../meta'

export default function Queue() {
  const { profile } = useAuth()
  const nav = useNavigate()
  const cat = useCatalog()
  const [rows, setRows] = useState(null)
  const [tab, setTab] = useState('open')
  const [ret, setRet] = useState(null)
  const [form, setForm] = useState({ feedback: '', awarded: '', total: '', file: null })
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const load = () => api.get('/orders?kind=offline_eval').then(d => setRows(d.results))
  useEffect(() => { load() }, [])

  const buckets = useMemo(() => {
    const all = rows || []
    return {
      open: all.filter(o => ['submitted', 'evaluating'].includes(o.status))
        .sort((a, b) => (a.sla_hours_left ?? 999) - (b.sla_hours_left ?? 999)),
      returned: all.filter(o => ['ready', 'approved'].includes(o.status)),
      missed: all.filter(o => o.status === 'refunded_sla' || o.sla_breached),
      all,
    }
  }, [rows])

  const start = async (o) => {
    try {
      await api.post(`/orders/${o.id}/start-evaluation`, {})
      toast.success('Marked as evaluating')
      load()
    } catch (e) { toast.error(e.message) }
  }

  const submit = async () => {
    if (!form.file) return toast.error('Attach the checked PDF')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('evaluator_feedback', form.feedback)
      fd.append('marks_awarded', form.awarded)
      fd.append('marks_total', form.total)
      fd.append('file', form.file)
      await api.upload(`/orders/${ret.id}/return`, fd)
      toast.success('Returned inside SLA — payment enters the review window')
      setRet(null); setForm({ feedback: '', awarded: '', total: '', file: null })
      load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  if (!rows) return <Loading label="Loading your queue" />

  const list = buckets[tab]
  const todayCount = buckets.open.reduce((n, o) => n + o.quantity, 0)
  const cap = profile?.max_daily_copies || 0

  return (
    <div className="a-rise">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink-900">Copy queue</h1>
          <p className="mt-1 text-[13.5px] text-ink-500">
            Ordered by how soon each SLA expires. Miss one and the aspirant is refunded
            automatically — you are not paid for the work.
          </p>
        </div>
        <Button as={Link} to="/app/calendar" variant="outline" size="sm" icon={<Icon.Clock size={14} />}>
          Adjust daily cap
        </Button>
      </div>

      {cap > 0 && (
        <Card className="mb-5" pad="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-extrabold text-ink-800">
                Workload · {todayCount} answer{todayCount === 1 ? '' : 's'} in the queue, cap {cap}/day
              </p>
              <Bar className="mt-2" value={todayCount} max={cap}
                tone={todayCount >= cap ? 'rose' : todayCount / cap > 0.7 ? 'gold' : 'mint'} />
              <p className="mt-1.5 text-[11.5px] text-ink-500">
                {todayCount >= cap
                  ? 'Your cap is reached — aspirants cannot buy more evaluations from you today.'
                  : `${cap - todayCount} more can be booked today before the cap kicks in.`}
              </p>
            </div>
          </div>
        </Card>
      )}

      <Segmented className="mb-5" value={tab} onChange={setTab} options={[
        { value: 'open', label: 'To evaluate', count: buckets.open.length },
        { value: 'returned', label: 'Returned', count: buckets.returned.length },
        { value: 'missed', label: 'SLA missed', count: buckets.missed.length },
        { value: 'all', label: 'All', count: buckets.all.length },
      ]} />

      {list.length === 0 ? (
        <Empty icon={<Icon.Pdf size={22} />}
          title={tab === 'open' ? 'Nothing to evaluate' : tab === 'missed' ? 'No missed SLAs — good' : 'Nothing here yet'}
          hint={tab === 'open'
            ? 'Copies land here the moment an aspirant uploads one, with the clock already running.'
            : undefined} />
      ) : (
        <div className="space-y-3">
          {list.map(o => {
            const urgent = o.sla_hours_left !== null && o.sla_hours_left < 6
            return (
              <Card key={o.id} className={urgent && tab === 'open' ? '!border-nex-200 !bg-nex-50' : ''}>
                <div className="flex flex-wrap items-start gap-4">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${urgent && tab === 'open' ? 'bg-white text-nex-600' : 'bg-gold-50 text-gold-600'}`}>
                    <Icon.Pdf size={19} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[14px] font-extrabold text-ink-900">
                        {o.quantity} answer{o.quantity > 1 ? 's' : ''} · {o.subject || 'unspecified paper'}
                      </h3>
                      <StatusChip status={o.status} label={o.status_label} />
                      {o.paid_with_credit && <Badge tone="mint" size="sm">Retainer credit</Badge>}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={o.student?.name} initials={o.student?.initials}
                          hue={o.student?.hue} size={16} />
                        <span className="font-semibold">{o.student?.name}</span>
                      </span>
                      <span>submitted {relative(o.created_at)}</span>
                      <span className="font-mono text-[11px] text-ink-400">{o.reference}</span>
                      <span className="font-bold text-mint-600">
                        {o.paid_with_credit ? 'credit' : `you get ${inr(o.mentor_payout)}`}
                      </span>
                    </p>

                    {o.agenda && (
                      <p className="mt-2 rounded-xl bg-white/70 px-3.5 py-2.5 text-[12px] italic leading-relaxed text-ink-600">
                        “{o.agenda}”
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <SlaChip hours={o.sla_hours} breached={o.sla_breached} hoursLeft={o.sla_hours_left} />
                      {o.annotation_count > 0 && (
                        <Badge tone="nex" icon={<Icon.Pencil size={11} />}>
                          {o.annotation_count} mark{o.annotation_count === 1 ? '' : 's'}
                        </Badge>
                      )}
                      {o.has_upload && (
                        <a href={`/api/orders/${o.id}/file/submitted`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-3 py-1 text-[11px] font-bold text-ink-700 transition hover:bg-ink-200">
                          <Icon.Pdf size={12} />{o.upload_name} →
                        </a>
                      )}
                      {o.has_return && (
                        <a href={`/api/orders/${o.id}/file/checked`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1 text-[11px] font-bold text-mint-700 transition hover:bg-mint-200">
                          <Icon.Check size={12} />checked copy →
                        </a>
                      )}
                    </div>

                    {o.sla_hours_left !== null && ['submitted', 'evaluating'].includes(o.status) && (
                      <div className="mt-3">
                        <Bar value={Math.max(0, o.sla_hours_left)} max={o.sla_hours}
                          tone={urgent ? 'rose' : o.sla_hours_left < 18 ? 'gold' : 'mint'} />
                        <p className={`mt-1.5 text-[11.5px] font-bold ${urgent ? 'text-nex-600' : 'text-ink-500'}`}>
                          {countdown(o.sla_hours_left)} left of the {o.sla_hours}-hour guarantee
                        </p>
                      </div>
                    )}

                    {o.marks_awarded !== null && o.marks_awarded !== undefined && (
                      <p className="mt-2.5 text-[12.5px] font-extrabold text-ink-900 tnum">
                        Marked {o.marks_awarded}/{o.marks_total}
                      </p>
                    )}
                  </div>

                  <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                    {o.status === 'submitted' && (
                      <Button size="sm" variant="outline" onClick={() => start(o)}>
                        Start evaluating
                      </Button>
                    )}
                    {['submitted', 'evaluating'].includes(o.status) && (
                      <>
                        <Button size="sm" onClick={() => nav(`/app/review/${o.id}`)}
                          icon={<Icon.Pencil size={14} />}>Open &amp; mark</Button>
                        <Button size="sm" variant="ghost" onClick={() => setRet(o)}
                          icon={<Icon.Upload size={14} />}>Upload PDF</Button>
                      </>
                    )}
                    {['ready', 'approved'].includes(o.status) && o.annotation_count > 0 && (
                      <Button size="sm" variant="outline" onClick={() => nav(`/app/review/${o.id}`)}
                        icon={<Icon.Eye size={14} />}>View marks</Button>
                    )}
                    {o.status === 'refunded_sla' && (
                      <Badge tone="rose">Refunded</Badge>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={!!ret} onClose={() => setRet(null)} width="max-w-md"
        title="Return the checked copy"
        subtitle={ret ? `${ret.reference} · ${ret.quantity} answer(s) · ${ret.student?.name}` : ''}
        footer={<>
          <Button variant="ghost" onClick={() => setRet(null)}>Cancel</Button>
          <Button loading={busy} onClick={submit} icon={<Icon.Upload size={15} />}>
            Return to aspirant
          </Button>
        </>}>
        <div className="space-y-4">
          {ret?.sla_hours_left !== null && ret?.sla_hours_left !== undefined && (
            <Alert tone={ret.sla_hours_left < 6 ? 'rose' : 'gold'} icon={<Icon.Clock size={16} />}>
              {ret.sla_hours_left > 0
                ? `${countdown(ret.sla_hours_left)} left of your ${ret.sla_hours}-hour SLA.`
                : 'Already past the SLA — this order has been refunded automatically.'}
            </Alert>
          )}
          <Field label="Checked PDF" required hint="Optional if you marked the copy in the review room · PDF, max 10 MB">
            <button type="button" onClick={() => fileRef.current?.click()}
              className={`focusable flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-3.5 text-left transition ${form.file ? 'border-mint-300 bg-mint-50' : 'border-ink-300 hover:border-nex-400'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${form.file ? 'bg-mint-100 text-mint-600' : 'bg-ink-100 text-ink-500'}`}>
                {form.file ? <Icon.Pdf size={18} /> : <Icon.Upload size={18} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-bold text-ink-800">
                  {form.file ? form.file.name : 'Choose the checked PDF'}
                </span>
                <span className="block text-[11px] text-ink-500">
                  {form.file ? `${(form.file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF only'}
                </span>
              </span>
            </button>
            <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
              onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marks awarded">
              <Input type="number" step="0.5" placeholder="11" value={form.awarded}
                onChange={e => setForm(f => ({ ...f, awarded: e.target.value }))} />
            </Field>
            <Field label="Out of">
              <Input type="number" step="0.5" placeholder="15" value={form.total}
                onChange={e => setForm(f => ({ ...f, total: e.target.value }))} />
            </Field>
          </div>
          <Field label="Summary feedback" hint="The headline fix. Detail belongs in the PDF margins.">
            <Textarea rows={4} value={form.feedback}
              onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))}
              placeholder="Claim in line two, always. Add the 41% devolution figure and Article 293(3). Rewrite and resend by Friday." />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
