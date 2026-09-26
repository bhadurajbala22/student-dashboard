import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Icon } from '../components/icons'
import { Alert, Avatar, Badge, Button, Empty, Loading, Modal, toast } from '../components/ui'
import { chatStamp, fullStamp, parseIst, relative, shortStamp } from '../format'

const dayLabel = (iso) => {
  const d = parseIst(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const y = new Date(today.getTime() - 86400000)
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function Chat() {
  const { threadId } = useParams()
  const { user, isMentor } = useAuth()
  const nav = useNavigate()
  const [threads, setThreads] = useState(null)
  const [convo, setConvo] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const endRef = useRef(null)
  const fileRef = useRef(null)
  const active = threadId ? Number(threadId) : null
  const [callFor, setCallFor] = useState(null)   // the peer we're calling about
  const [sessions, setSessions] = useState([])

  const loadThreads = () => api.get('/chat/threads').then(d => {
    setThreads(d.results)
    if (!active && d.results.length) nav(`/app/chat/${d.results[0].id}`, { replace: true })
  })

  useEffect(() => { loadThreads() }, [])

  // scheduled calls between these two, so the Call button knows what to offer
  useEffect(() => {
    api.get('/orders?kind=video_1on1,live_eval&status=confirmed')
      .then(d => setSessions(d.results)).catch(() => {})
  }, [active])

  const callState = (peerId) => {
    const mine = sessions
      .filter(o => (isMentor ? o.student?.id : o.mentor?.id) === peerId)
      .sort((a, b) => (a.start_at || '').localeCompare(b.start_at || ''))
    const joinable = mine.find(o => o.join_open)
    return { joinable, next: mine[0] || null, all: mine }
  }

  useEffect(() => {
    if (!active) { setConvo(null); return }
    setConvo(null)
    api.get(`/chat/threads/${active}/messages`).then(setConvo).catch(() => {})
    const id = setInterval(() => {
      api.get(`/chat/threads/${active}/messages`).then(setConvo).catch(() => {})
    }, 6000)
    return () => clearInterval(id)
  }, [active])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [convo?.messages?.length])

  const send = async (e) => {
    e?.preventDefault()
    const body = draft.trim()
    if (!body || !active) return
    setSending(true); setDraft('')
    try {
      const msg = await api.post(`/chat/threads/${active}/messages`, { body })
      setConvo(c => ({ ...c, messages: [...(c?.messages || []), msg] }))
      loadThreads()
    } catch (err) { toast.error(err.message); setDraft(body) } finally { setSending(false) }
  }

  const attach = async (file) => {
    if (!file || !active) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const msg = await api.upload(`/chat/threads/${active}/attachment`, fd)
      setConvo(c => ({ ...c, messages: [...(c?.messages || []), msg] }))
      toast.success('Attached')
      loadThreads()
    } catch (e) { toast.error(e.message) }
  }

  const filtered = useMemo(() => {
    if (!threads) return []
    const q = search.trim().toLowerCase()
    if (!q) return threads
    return threads.filter(t => t.peer.name.toLowerCase().includes(q)
      || (t.last_message || '').toLowerCase().includes(q))
  }, [threads, search])

  const grouped = useMemo(() => {
    if (!convo?.messages) return []
    const out = []
    let last = null
    convo.messages.forEach(m => {
      const d = dayLabel(m.created_at)
      if (d !== last) { out.push({ divider: d, id: `d-${m.id}` }); last = d }
      out.push(m)
    })
    return out
  }, [convo])

  if (!threads) return <Loading label="Loading conversations" />

  if (threads.length === 0) {
    return (
      <div className="a-rise">
        <h1 className="mb-5 text-[30px] font-extrabold tracking-[-0.03em] text-ink-900">Messages</h1>
        <Empty icon={<Icon.Chat size={22} />} title="No conversations yet"
          hint={isMentor
            ? 'A thread opens automatically the moment an aspirant books with you.'
            : 'Open a storefront and hit Message — or just book, and the thread starts itself.'}
          action={!isMentor && <Button as={Link} to="/app/discover" icon={<Icon.Search size={15} />}>
            Find a mentor
          </Button>} />
      </div>
    )
  }

  return (
    <div className="a-rise">
      <div className="mb-5">
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] text-ink-900">Messages</h1>
        <p className="mt-1 text-[13.5px] text-ink-500">
          One thread per {isMentor ? 'aspirant' : 'mentor'}, kept permanently — feedback, slot
          changes and reading lists all stay searchable.
        </p>
      </div>

      <div className="surface grid h-[calc(100vh-16rem)] min-h-[500px] overflow-hidden !p-0 md:grid-cols-[300px_1fr]">
        <aside className={`flex flex-col border-ink-200 md:border-r ${active ? 'hidden md:flex' : 'flex'}`}>
          <div className="border-b border-ink-200 p-3">
            <div className="relative">
              <Icon.Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="h-9 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-[12.5px] outline-none focus:border-nex-400 focus:bg-white" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map(t => {
              const on = t.id === active
              return (
                <button key={t.id} onClick={() => nav(`/app/chat/${t.id}`)}
                  className={`flex w-full items-start gap-3 border-b border-ink-100 px-3.5 py-3 text-left transition ${on ? 'bg-nex-50' : 'hover:bg-ink-25'}`}>
                  <Avatar name={t.peer.name} initials={t.peer.initials} hue={t.peer.hue} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-[12.5px] ${t.unread ? 'font-extrabold text-ink-900' : 'font-bold text-ink-800'}`}>
                        {t.peer.name}
                      </p>
                      <span className="shrink-0 text-[10px] text-ink-400">{relative(t.last_message_at)}</span>
                    </div>
                    <p className={`mt-0.5 line-clamp-2 text-[11.5px] leading-snug ${t.unread ? 'font-semibold text-ink-700' : 'text-ink-500'}`}>
                      {t.last_sender_id === user.id && <span className="text-ink-400">You: </span>}
                      {t.last_message || 'No messages yet'}
                    </p>
                  </div>
                  {t.unread > 0 && (
                    <span className="mt-1 grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-nex-600 px-1.5 text-[10px] font-extrabold text-white tnum">
                      {t.unread}
                    </span>
                  )}
                </button>
              )
            })}
            {filtered.length === 0 && (
              <p className="px-4 py-10 text-center text-[12.5px] text-ink-400">No matches.</p>
            )}
          </div>
        </aside>

        <section className={`flex min-w-0 flex-col ${active ? 'flex' : 'hidden md:flex'}`}>
          {!convo ? <div className="grid flex-1 place-items-center"><Loading label="Opening" /></div> : (
            <>
              <header className="flex items-center gap-3 border-b border-ink-200 px-4 py-3">
                <button onClick={() => nav('/app/chat')} aria-label="Back to conversations"
                  className="focusable tap grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ink-500 md:hidden">
                  <Icon.Chevron size={18} className="rotate-180" />
                </button>
                <Avatar name={convo.peer.name} initials={convo.peer.initials} hue={convo.peer.hue} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-extrabold text-ink-900">{convo.peer.name}</p>
                  <p className="text-[11.5px] text-ink-500">
                    {convo.peer.role === 'mentor' ? 'Mentor' : 'Aspirant'} · {convo.messages.length} messages
                    {convo.peer.response_hours ? ` · replies in ~${convo.peer.response_hours}h` : ''}
                  </p>
                </div>
                {(() => {
                  const { joinable } = callState(convo.peer.id)
                  return joinable ? (
                    <Button as="a" href={joinable.meeting_link} target="_blank" rel="noreferrer"
                      size="sm" variant="mint" className="a-breathe"
                      icon={<Icon.Video size={15} />}>
                      <span className="hidden sm:inline">Join call</span>
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setCallFor(convo.peer)}
                      aria-label="Call" icon={<Icon.Phone2 size={15} />}>
                      <span className="hidden sm:inline">Call</span>
                    </Button>
                  )
                })()}
                {convo.peer.role === 'mentor' && (
                  <Button as={Link} to={`/app/mentors/${convo.peer.id}`} size="sm" variant="outline"
                    className="hidden sm:inline-flex">
                    Storefront
                  </Button>
                )}
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-ink-25 px-4 py-4">
                {grouped.map(item => item.divider ? (
                  <div key={item.id} className="flex items-center gap-3 py-1">
                    <span className="h-px flex-1 bg-ink-200" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-400">
                      {item.divider}
                    </span>
                    <span className="h-px flex-1 bg-ink-200" />
                  </div>
                ) : (
                  <div key={item.id} className={`flex ${item.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${item.sender_id === user.id
                      ? 'rounded-br-md bg-nex-600 text-white'
                      : 'rounded-bl-md border border-ink-200 bg-white text-ink-800'}`}>
                      {item.attachment && (
                        <a href={`/api/orders/0/file/submitted`} onClick={e => e.preventDefault()}
                          className={`mb-1.5 flex items-center gap-2 rounded-lg px-2 py-1.5 ${item.sender_id === user.id ? 'bg-white/15' : 'bg-ink-50'}`}>
                          <Icon.File size={14} /><span className="text-[11.5px] font-bold">Attachment</span>
                        </a>
                      )}
                      <p className="whitespace-pre-wrap">{item.body}</p>
                      <p className={`mt-1 text-[10px] ${item.sender_id === user.id ? 'text-white/65' : 'text-ink-400'}`}>
                        {chatStamp(item.created_at)}
                        {item.sender_id === user.id && (item.read_at ? ' · read' : ' · sent')}
                      </p>
                    </div>
                  </div>
                ))}
                {convo.messages.length === 0 && (
                  <p className="py-12 text-center text-[12.5px] text-ink-400">
                    No messages yet — say hello and describe what you need.
                  </p>
                )}
                <div ref={endRef} />
              </div>

              {!isMentor && (
                <p className="flex items-start gap-2 border-t border-ink-200 bg-gold-50 px-4 py-2 text-[11px] leading-snug text-gold-800">
                  <Icon.Info size={13} className="mt-px shrink-0" />
                  Mentors set their own schedules — typical response is 24–48 hours. This is for
                  follow-ups, not real-time support.
                </p>
              )}

              <form onSubmit={send} className="flex items-end gap-2 border-t border-ink-200 bg-white px-3 py-3">
                <button type="button" onClick={() => fileRef.current?.click()}
                  title="Attach an image of a doubt, or a PDF"
                  className="focusable grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-ink-200 text-ink-500 transition hover:bg-ink-50">
                  <Icon.File size={17} />
                </button>
                <input ref={fileRef} type="file" className="hidden" accept="image/*,application/pdf"
                  onChange={e => { attach(e.target.files?.[0]); e.target.value = '' }} />
                <textarea value={draft} onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e) }}
                  rows={1} placeholder="Write a message…  (Enter to send, Shift+Enter for a new line)"
                  className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-ink-200 bg-ink-50 px-3.5 py-3 text-[13px] outline-none transition focus:border-nex-400 focus:bg-white focus:ring-4 focus:ring-nex-100" />
                <Button type="submit" loading={sending} disabled={!draft.trim()}
                  className="!h-11 !w-11 !p-0" title="Send">
                  {!sending && <Icon.Send size={17} />}
                </Button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* ── calling is anchored to a booked session, so escrow still applies ── */}
      <Modal open={!!callFor} onClose={() => setCallFor(null)} width="max-w-md"
        title={`Call ${callFor?.name || ''}`}
        subtitle={isMentor ? 'Calls run inside a booked session' : 'Calls run inside a booked session'}>
        {(() => {
          if (!callFor) return null
          const { next, all } = callState(callFor.id)
          return (
            <div className="space-y-4">
              {next ? (
                <>
                  <Alert tone="nex" icon={<Icon.Calendar size={16} />} title="Your next call">
                    {fullStamp(next.start_at)} · {next.duration_minutes} minutes
                    {next.minutes_to_start > 0 && ` — starts ${relative(next.start_at)}`}
                  </Alert>
                  <p className="text-[12.5px] leading-relaxed text-ink-600">
                    The video room unlocks five minutes before the start time, and the Call
                    button here turns green when it does.
                  </p>
                  {next.meeting_link && (
                    <Button as="a" href={next.meeting_link} target="_blank" rel="noreferrer"
                      variant="outline" className="w-full" icon={<Icon.Link size={15} />}>
                      Copy the room link for later
                    </Button>
                  )}
                  {all.length > 1 && (
                    <p className="text-[11.5px] text-ink-500">
                      {all.length - 1} more session{all.length > 2 ? 's' : ''} booked after this.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Alert tone="gold" icon={<Icon.Info size={16} />} title="No call booked yet">
                    {isMentor
                      ? "You don't have a confirmed session with this aspirant. Ask them to book a slot — that way the time is paid for and held in escrow, and the session is recorded to the vault."
                      : 'Book a slot to talk. Your payment is held in escrow until the session is delivered, and the recording stays in your vault for a week.'}
                  </Alert>
                  {!isMentor && (
                    <Button as={Link} to={`/app/mentors/${callFor.id}`} className="w-full"
                      onClick={() => setCallFor(null)} icon={<Icon.Video size={15} />}>
                      See {callFor.name.split(' ')[0]}&apos;s available slots
                    </Button>
                  )}
                </>
              )}
              <p className="text-[11px] leading-relaxed text-ink-400">
                Ad-hoc calls outside a booking aren’t supported on purpose — it is what keeps
                every minute escrow-protected, recorded, and disputable if something goes wrong.
              </p>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
