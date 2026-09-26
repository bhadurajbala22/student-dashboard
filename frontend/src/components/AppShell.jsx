import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { relative } from '../format'
import { Brand } from './Brand'
import { Icon } from './icons'
import { Avatar, Badge, Button } from './ui'

const STUDENT_NAV = [
  { to: '/app', label: 'Workspace', short: 'Home', icon: Icon.Grid, end: true },
  { to: '/app/discover', label: 'Find a mentor', short: 'Explore', icon: Icon.Search },
  { to: '/app/orders', label: 'My bookings', short: 'Bookings', icon: Icon.Package, badge: 'action' },
  { to: '/app/vault', label: 'Session vault', icon: Icon.Video },
  { to: '/app/chat', label: 'Messages', short: 'Chat', icon: Icon.Chat, badge: 'chat' },
  { to: '/app/profile', label: 'My profile', icon: Icon.User },
]

const MENTOR_NAV = [
  { to: '/app', label: 'Dashboard', short: 'Home', icon: Icon.Grid, end: true },
  { to: '/app/requests', label: 'Requests', short: 'Requests', icon: Icon.Bell, badge: 'requests' },
  { to: '/app/queue', label: 'Copy queue', short: 'Queue', icon: Icon.Pdf, badge: 'queue' },
  { to: '/app/orders', label: 'All orders', icon: Icon.Package },
  { to: '/app/calendar', label: 'Calendar', icon: Icon.Calendar },
  { to: '/app/storefront', label: 'My storefront', icon: Icon.Cap },
  { to: '/app/earnings', label: 'Earnings', icon: Icon.Wallet },
  { to: '/app/vault', label: 'Session vault', icon: Icon.Video },
  { to: '/app/chat', label: 'Messages', short: 'Chat', icon: Icon.Chat, badge: 'chat' },
]

/* the bottom bar shows the four most-used destinations, then More */
const STUDENT_TABS = ['/app', '/app/discover', '/app/orders', '/app/chat']
const MENTOR_TABS = ['/app', '/app/requests', '/app/queue', '/app/chat']

export default function AppShell() {
  const { user, profile, logout, isMentor } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  const [counts, setCounts] = useState({ chat: 0, requests: 0, queue: 0, action: 0 })
  const [notes, setNotes] = useState({ unread: 0, results: [] })
  const [bell, setBell] = useState(false)
  const [mobile, setMobile] = useState(false)

  const items = isMentor ? MENTOR_NAV : STUDENT_NAV
  const tabPaths = isMentor ? MENTOR_TABS : STUDENT_TABS
  const tabs = tabPaths.map(tp => items.find(i => i.to === tp)).filter(Boolean)

  const poll = async () => {
    try {
      const [threads, notif] = await Promise.all([
        api.get('/chat/threads'), api.get('/notifications'),
      ])
      const next = { chat: threads.unread_total, requests: 0, queue: 0, action: 0 }
      if (isMentor) {
        const [pend, q] = await Promise.all([
          api.get('/orders?status=pending'),
          api.get('/orders?kind=offline_eval&status=submitted,evaluating'),
        ])
        next.requests = pend.count
        next.queue = q.count
      } else {
        const act = await api.get('/orders?status=delivered,ready')
        next.action = act.count
      }
      setCounts(next)
      setNotes(notif)
    } catch { /* offline is fine */ }
  }

  useEffect(() => {
    poll()
    const id = setInterval(poll, 20000)
    return () => clearInterval(id)
  }, [location.pathname])

  useEffect(() => { setMobile(false); setBell(false) }, [location.pathname])

  const markRead = async () => {
    try {
      await api.post('/notifications/read')
      setNotes(n => ({ unread: 0, results: n.results.map(r => ({ ...r, is_read: true })) }))
    } catch { /* ignore */ }
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="px-5 py-5"><Brand to="/app" /></div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 no-bar">
        {items.map(item => {
          const badge = item.badge ? counts[item.badge] : 0
          return (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold transition ${isActive
                ? 'bg-ink-900 text-white shadow-sm'
                : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}`}>
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-1 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-gold-400" />
                  )}
                  <item.icon size={17} className={isActive ? 'text-gold-400' : 'text-ink-400'} />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-nex-600 px-1.5 text-[10.5px] font-extrabold text-white tnum">
                      {badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="m-3 rounded-2xl border border-ink-200 bg-ink-50 p-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} initials={user.initials} hue={user.hue} photo={profile?.photo} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-extrabold text-ink-900">{user.name}</p>
            <p className="truncate text-[10.5px] font-bold text-ink-500">
              {isMentor
                ? `${profile?.category === 'ranker' ? 'Ranker' : profile?.category === 'faculty' ? 'Faculty' : 'Veteran'} · ${profile?.is_listed ? 'live' : 'paused'}`
                : `Target ${profile?.target_year || '—'}`}
            </p>
          </div>
          <button onClick={() => { logout(); nav('/') }} title="Sign out"
            className="focusable rounded-lg p-1.5 text-ink-400 transition hover:bg-white hover:text-nex-600">
            <Icon.Logout size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#dfe8f3] lg:p-4">
      <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[236px] shrink-0 overflow-hidden rounded-l-[28px] lg:block">
        {sidebar}
      </aside>

      {mobile && (
        <div className="fixed inset-0 z-[70] flex lg:hidden" onClick={() => setMobile(false)}>
          <div className="a-slide h-full w-[236px]" onClick={e => e.stopPropagation()}>{sidebar}</div>
          <div className="flex-1 bg-ink-950/60 backdrop-blur-sm" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col bg-[#f6f9fd] lg:min-h-[calc(100vh-2rem)] lg:rounded-r-[28px]">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/95 px-4 backdrop-blur-xl sm:px-6 lg:top-4 lg:rounded-tr-[28px]">
          <div className="lg:hidden"><Brand compact to="/app" /></div>

          <div className="hidden flex-1 items-center gap-2.5 lg:flex">
            <Badge tone="nex" icon={<span className="h-1.5 w-1.5 rounded-full bg-nex-600 a-breathe" />}>
              Escrow protected
            </Badge>
            <span className="text-[12px] font-semibold text-ink-400">
              All times IST · {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {!isMentor && (
              <Button as={NavLink} to="/app/discover" size="sm" variant="soft"
                icon={<Icon.Search size={14} />} className="hidden sm:inline-flex">
                Find a mentor
              </Button>
            )}
            <div className="relative">
              <button onClick={() => { setBell(o => !o); if (!bell && notes.unread) markRead() }}
                aria-label="Notifications"
                className="focusable tap relative grid h-11 w-11 place-items-center rounded-xl border border-ink-200 bg-white text-ink-600 transition hover:text-ink-900">
                <Icon.Bell size={18} />
                {notes.unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-nex-600 px-1 text-[10px] font-extrabold text-white tnum">
                    {notes.unread}
                  </span>
                )}
              </button>
              {bell && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBell(false)} />
                  <div className="a-pop absolute right-0 z-20 mt-2 w-[340px] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl">
                    <div className="border-b border-ink-200 px-4 py-3 text-[13px] font-extrabold">Notifications</div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notes.results.length === 0 && (
                        <p className="px-4 py-10 text-center text-[12.5px] text-ink-400">Nothing yet.</p>
                      )}
                      {notes.results.map(n => (
                        <div key={n.id} className="flex gap-3 border-b border-ink-100 px-4 py-3 last:border-0 hover:bg-ink-25">
                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.kind === 'success' ? 'bg-mint-500'
                            : n.kind === 'warning' ? 'bg-gold-500' : n.kind === 'request' ? 'bg-nex-600'
                              : n.kind === 'message' ? 'bg-nex-400' : 'bg-ink-300'}`} />
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-bold text-ink-900">{n.title}</p>
                            {n.body && <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{n.body}</p>}
                            <p className="mt-1 text-[11px] text-ink-400">{relative(n.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <NavLink to={isMentor ? '/app/storefront' : '/app/profile'}
              aria-label="My profile"
              className="focusable tap hidden h-11 w-11 place-items-center rounded-full sm:grid">
              <Avatar name={user.name} initials={user.initials} hue={user.hue} photo={profile?.photo} size={38} />
            </NavLink>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 pb-tabbar sm:px-6 sm:py-8 lg:pb-8">
          <Outlet />
        </main>

        {/* ── mobile / tablet: native-feeling bottom tab bar ───────────── */}
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 pb-safe shadow-[0_-8px_30px_-22px_rgba(28,36,56,.35)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-lg items-stretch">
            {tabs.map(tab => {
              const badge = tab.badge ? counts[tab.badge] : 0
              return (
                <NavLink key={tab.to} to={tab.to} end={tab.end}
                  className={({ isActive }) => `focusable relative flex min-h-[3.4rem] flex-1 flex-col items-center justify-center gap-1 pt-1.5 text-[10px] font-extrabold transition ${isActive ? 'text-nex-600' : 'text-ink-400'}`}>
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-x-4 top-0 h-[2.5px] rounded-b-full bg-nex-600" />
                      )}
                      <span className="relative">
                        <tab.icon size={21} />
                        {badge > 0 && (
                          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-nex-600 px-1 text-[9px] font-extrabold text-white tnum">
                            {badge > 9 ? '9+' : badge}
                          </span>
                        )}
                      </span>
                      <span className="leading-none">{tab.short || tab.label.split(' ')[0]}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
            <button onClick={() => setMobile(true)} aria-label="More"
              className="focusable flex min-h-[3.4rem] flex-1 flex-col items-center justify-center gap-1 pt-1.5 text-[10px] font-extrabold text-ink-400 transition">
              <Icon.Menu size={21} />
              <span className="leading-none">More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
