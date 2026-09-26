import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getToken } from '../api'
import { useAuth } from '../auth'
import { VaultNote } from '../components/domain'
import { Icon } from '../components/icons'
import {
  Alert, Avatar, Badge, Bar, Button, Card, Empty, Field, Input, Loading, Modal, SectionHead,
  Segmented, Textarea, toast,
} from '../components/ui'
import { countdown, inr, mbLabel, minutesLabel, relative, shortStamp } from '../format'

function Player({ rec }) {
  const src = `/api/vault/${rec.id}/stream?token=${encodeURIComponent(getToken() || '')}`
  const audio = (rec.content_type || '').startsWith('audio')
  return (
    <div className="mt-3.5 overflow-hidden rounded-2xl bg-ink-950 p-3">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-ink-400">
          <Icon.Lock size={12} /> Vault stream · download disabled
        </p>
        <Badge tone="dark" className="!bg-white/10 !text-ink-300">
          {audio ? 'Audio track' : 'Video'}
        </Badge>
      </div>
      {audio
        ? <audio controls controlsList="nodownload" preload="metadata" src={src} className="w-full" />
        : <video controls controlsList="nodownload" disablePictureInPicture preload="metadata"
            src={src} className="w-full rounded-xl" style={{ aspectRatio: '16/9' }} />}
    </div>
  )
}

function Retention({ rec }) {
  if (rec.status !== 'available') return null
  const urgent = rec.days_left <= 2
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-[11.5px]">
        <span className={urgent ? 'font-extrabold text-nex-600' : 'font-semibold text-ink-500'}>
          {rec.days_left >= 1
            ? `${rec.days_left} day${rec.days_left === 1 ? '' : 's'} left to stream`
            : `${rec.hours_left} hour${rec.hours_left === 1 ? '' : 's'} left`}
        </span>
        <span className="text-ink-400">archives {relative(rec.expires_at)}</span>
      </div>
      <Bar className="mt-1.5" value={rec.days_left} max={rec.stream_days}
        tone={urgent ? 'rose' : 'mint'} />
    </div>
  )
}

export default function Vault() {
  const { isMentor } = useAuth()
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('available')
  const [playing, setPlaying] = useState(null)
  const [upload, setUpload] = useState(false)
  const [orders, setOrders] = useState([])
  const [form, setForm] = useState({ order_id: '', notes: '', duration: '', file: null })
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const load = () => api.get('/vault').then(setData)
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!isMentor) return
    api.get('/orders?kind=video_1on1,live_eval&status=confirmed,delivered,approved')
      .then(d => setOrders(d.results)).catch(() => {})
  }, [isMentor])

  const submit = async () => {
    if (!form.order_id) return toast.error('Pick the session this belongs to')
    if (!form.file) return toast.error('Choose a file')
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('order_id', form.order_id)
      fd.append('notes', form.notes)
      fd.append('duration_seconds', String(Number(form.duration || 0) * 60))
      fd.append('file', form.file)
      await api.upload('/vault/upload', fd)
      toast.success('Added to the vault')
      setUpload(false); setForm({ order_id: '', notes: '', duration: '', file: null })
      load()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const sweep = async () => {
    try {
      const r = await api.post('/admin/sweep', {})
      toast.info(`Sweep complete — ${r.archived} archived, ${r.purged} purged, ${r.released} released`)
      load()
    } catch (e) { toast.error(e.message) }
  }

  if (!data) return <Loading label="Opening the vault" />

  const groups = {
    available: data.results.filter(r => r.status === 'available'),
    archived: data.results.filter(r => r.status === 'archived'),
    purged: data.results.filter(r => r.status === 'purged'),
  }
  const list = groups[tab]

  return (
    <div className="a-rise">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.03em] text-ink-900">
            Session vault
          </h1>
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-500">
            {data.policy.summary}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={sweep} icon={<Icon.Refresh size={14} />}>
            Run retention sweep
          </Button>
          {isMentor && (
            <Button onClick={() => setUpload(true)} icon={<Icon.Upload size={16} />}>
              Add recording
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          ['Streamable now', groups.available.length, 'bg-mint-500',
           `inside the ${data.policy.stream_days}-day window`],
          ['In cold archive', groups.archived.length, 'bg-gold-500',
           `purged on day ${data.policy.purge_days}`],
          ['Purged', groups.purged.length, 'bg-ink-300', 'metadata kept as an audit trail'],
        ].map(([label, value, dot, hint]) => (
          <Card key={label} pad="p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-500">{label}</p>
            </div>
            <p className="mt-2 text-[25px] font-extrabold leading-none text-ink-900 tnum">{value}</p>
            <p className="mt-2 text-[11.5px] text-ink-500">{hint}</p>
          </Card>
        ))}
      </div>

      <Segmented className="mb-5" value={tab} onChange={setTab} options={[
        { value: 'available', label: 'Streamable', count: groups.available.length },
        { value: 'archived', label: 'Archived', count: groups.archived.length },
        { value: 'purged', label: 'Purged', count: groups.purged.length },
      ]} />

      {list.length === 0 ? (
        <Empty icon={<Icon.Video size={22} />}
          title={tab === 'available' ? 'Nothing in the streaming window'
            : tab === 'archived' ? 'Nothing in cold archive' : 'Nothing purged yet'}
          hint={isMentor
            ? 'Recordings you add against a session appear here and stream for the aspirant for a week.'
            : 'Recordings appear here once your live sessions are delivered.'}
          action={isMentor
            ? <Button onClick={() => setUpload(true)} icon={<Icon.Upload size={15} />}>Add recording</Button>
            : <Button as={Link} to="/app/orders" variant="outline">See my bookings</Button>} />
      ) : (
        <div className="space-y-3">
          {list.map(rec => (
            <Card key={rec.id}>
              <div className="flex flex-wrap items-start gap-4">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${rec.status === 'available' ? 'bg-mint-50 text-mint-600'
                  : rec.status === 'archived' ? 'bg-gold-50 text-gold-600' : 'bg-ink-100 text-ink-400'}`}>
                  {rec.status === 'available' ? <Icon.Play size={19} />
                    : rec.status === 'archived' ? <Icon.Archive size={19} /> : <Icon.Trash size={19} />}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-extrabold text-ink-900">{rec.order?.title}</h3>
                    <Badge tone={rec.status === 'available' ? 'mint' : rec.status === 'archived' ? 'gold' : 'ink'}>
                      {rec.status}
                    </Badge>
                    {rec.order?.is_anonymous && (
                      <Badge tone="dark" icon={<Icon.Incognito size={11} />} size="sm">Anonymous</Badge>
                    )}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Avatar name={rec.order?.peer_name} initials={rec.order?.peer_initials}
                        hue={rec.order?.peer_hue} anonymous={rec.order?.is_anonymous} size={16} />
                      <span className="font-semibold">{rec.order?.peer_name}</span>
                    </span>
                    <span>{shortStamp(rec.order?.start_at)}</span>
                    <span>{mbLabel(rec.size_mb)}</span>
                    <span>{minutesLabel(Math.round(rec.duration_seconds / 60))}</span>
                    <span className="font-mono text-[11px] text-ink-400">{rec.order?.reference}</span>
                  </p>
                  {rec.notes && (
                    <p className="mt-2 rounded-xl bg-ink-25 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-600">
                      {rec.notes}
                    </p>
                  )}

                  <Retention rec={rec} />

                  {rec.status === 'archived' && (
                    <p className="mt-2.5 text-[11.5px] text-gold-700">
                      Archived {relative(rec.archived_at)} — the media is in cold storage and no
                      longer streamable. It is purged {relative(rec.purge_at)}.
                    </p>
                  )}
                  {rec.status === 'purged' && (
                    <p className="mt-2.5 text-[11.5px] text-ink-500">
                      Media permanently deleted {relative(rec.purged_at)}. This row remains as
                      proof the session was recorded.
                    </p>
                  )}

                  {playing === rec.id && rec.streamable && <Player rec={rec} />}
                </div>

                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                  {rec.streamable ? (
                    <Button size="sm" onClick={() => setPlaying(playing === rec.id ? null : rec.id)}
                      icon={playing === rec.id ? <Icon.Pause size={14} /> : <Icon.Play size={14} />}>
                      {playing === rec.id ? 'Close' : 'Stream'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled>Not streamable</Button>
                  )}
                  <Button size="sm" variant="ghost" disabled
                    title="Vault policy: downloads are disabled for both parties"
                    icon={<Icon.Lock size={14} />}>No download</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <VaultNote days={data.policy.stream_days} />
        <Alert tone="nex" icon={<Icon.Info size={16} />} title="Retention timeline">
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>Day 0–{data.policy.stream_days}: the aspirant can stream it for revision.</li>
            <li>Day {data.policy.stream_days}: moves to cold archive automatically — playback stops, metadata stays.</li>
            <li>Day {data.policy.purge_days}: the media file is permanently purged.</li>
            <li>Downloads are blocked throughout, for the mentor and the aspirant alike.</li>
          </ul>
        </Alert>
      </div>

      {/* mentor upload */}
      <Modal open={upload} onClose={() => setUpload(false)} width="max-w-md"
        title="Add a session recording"
        subtitle="Stands in for the platform's automatic recorder in this build"
        footer={<>
          <Button variant="ghost" onClick={() => setUpload(false)}>Cancel</Button>
          <Button loading={busy} onClick={submit} icon={<Icon.Upload size={15} />}>Add to vault</Button>
        </>}>
        <div className="space-y-4">
          <Field label="Which session?" required>
            <select className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-[13.5px] outline-none focus:border-nex-400 focus:ring-4 focus:ring-nex-100"
              value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))}>
              <option value="">Select a confirmed or delivered session</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.reference} · {o.title} · {o.student?.name} · {shortStamp(o.start_at)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Recording file" required
            hint="webm, mp4, mov, mkv, or an audio track · up to 512 MB">
            <button type="button" onClick={() => fileRef.current?.click()}
              className={`focusable flex w-full items-center gap-3 rounded-xl border border-dashed px-4 py-3.5 text-left transition ${form.file ? 'border-mint-300 bg-mint-50' : 'border-ink-300 hover:border-nex-400'}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${form.file ? 'bg-mint-100 text-mint-600' : 'bg-ink-100 text-ink-500'}`}>
                {form.file ? <Icon.Video size={18} /> : <Icon.Upload size={18} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-bold text-ink-800">
                  {form.file ? form.file.name : 'Choose a file'}
                </span>
                <span className="block text-[11px] text-ink-500">
                  {form.file ? `${(form.file.size / 1024 / 1024).toFixed(1)} MB` : 'Click to browse'}
                </span>
              </span>
            </button>
            <input ref={fileRef} type="file" className="hidden" accept="video/*,audio/*"
              onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
          </Field>
          <Field label="Duration in minutes" hint="Optional — defaults to the booked length.">
            <Input type="number" min="0" value={form.duration} placeholder="60"
              onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
          </Field>
          <Field label="Note for the aspirant">
            <Textarea rows={3} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Covered Articles 245-255 and pith and substance. Homework: rewrite the federalism answer using the structure on the board." />
          </Field>
          <Alert tone="ink" icon={<Icon.Lock size={15} />}>
            Neither you nor the aspirant will be able to download this. They can stream it for{' '}
            {data.policy.stream_days} days; our team retains access for dispute evidence.
          </Alert>
        </div>
      </Modal>
    </div>
  )
}
