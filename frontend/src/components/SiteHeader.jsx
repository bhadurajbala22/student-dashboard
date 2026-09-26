import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Brand } from './Brand'
import { Icon } from './icons'
import { Button } from './ui'

const NAV = [
  { label: 'Premium faculty', to: '/mentors?category=faculty' },
  { label: 'Find a mentor', to: '/mentors' },
  { label: 'Services', to: '/#services', hash: true },
]

/**
 * The public chrome: the mark, a small pill of navigation, and the account
 * actions. Below `md` the pill collapses into a sheet so the same destinations
 * stay reachable on a phone.
 */
export default function SiteHeader({ next }) {
  const [mobile, setMobile] = useState(false)
  const [solid, setSolid] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const on = () => setSolid(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  // a route change should never leave the sheet hanging open
  useEffect(() => { setMobile(false) }, [location.key])

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') setMobile(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobile ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobile])

  const q = next ? `?next=${next}` : ''
  const closeAll = () => setMobile(false)
  const pill = 'focusable rounded-full px-4 py-2 text-[12.5px] font-bold text-ink-600 transition hover:bg-white hover:text-ink-900 hover:shadow-sm'

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${solid
        ? 'border-ink-200 bg-white/95 shadow-sm backdrop-blur-xl'
        : 'border-transparent bg-white'}`}>
      <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-3 px-4 sm:px-5">
        <Brand />

        <nav className="mx-auto hidden items-center gap-1 rounded-full bg-ink-50 p-1 md:flex">
          {NAV.map(item => item.hash
            ? <a key={item.label} href={item.to} className={pill}>{item.label}</a>
            : <NavLink key={item.label} to={item.to} className={pill}>{item.label}</NavLink>)}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button as={Link} to={`/login${q}`} size="sm" variant="ghost"
            className="hidden sm:inline-flex">
            Sign in
          </Button>
          <Button as={Link} to={`/join${q}`} size="pill" variant="gold"
            className="!h-10 !px-5 !text-[13px]">
            Get started
          </Button>
          <button onClick={() => setMobile(o => !o)} aria-label="Menu" aria-expanded={mobile}
            className="focusable tap grid h-10 w-10 place-items-center rounded-xl border border-ink-200 text-ink-700 md:hidden">
            {mobile ? <Icon.X size={18} /> : <Icon.Menu size={18} />}
          </button>
        </div>
      </div>

      {mobile && (
        <div className="absolute inset-x-0 top-full border-t border-ink-200 bg-white px-4 pb-6 shadow-xl md:hidden">
          <nav className="divide-y divide-ink-100">
            {NAV.map(item => item.hash
              ? <a key={item.label} href={item.to} onClick={closeAll}
                  className="block py-4 text-[14px] font-extrabold text-ink-900">{item.label}</a>
              : <Link key={item.label} to={item.to} onClick={closeAll}
                  className="block py-4 text-[14px] font-extrabold text-ink-900">{item.label}</Link>)}
          </nav>
          <div className="mt-6 grid gap-2.5">
            <Button as={Link} to={`/login${q}`} size="lg" variant="outline" onClick={closeAll}>
              Sign in
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
