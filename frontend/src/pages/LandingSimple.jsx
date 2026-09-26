import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { CATEGORY_META, SERVICE_ICON } from '../components/domain'
import { Icon } from '../components/icons'
import { SiteFooter } from '../components/PublicShell'
import SiteHeader from '../components/SiteHeader'
import { Avatar, Button, Stars } from '../components/ui'
import { inr } from '../format'

/* Four pastels drawn straight from the brand palette — two tints of #003566
   alternating with two tints of #FFC300, so the row reads as one family. */
const SERVICE_CARDS = [
  ['video_1on1', '1-on-1 session', 'Strategy, planning and subject doubts.', 'bg-[#dce8f6]'],
  ['offline_eval', 'Copy evaluation', 'Annotated answers with a guaranteed SLA.', 'bg-[#fff2c7]'],
  ['live_eval', 'Live copy review', 'Rebuild your answer with a mentor.', 'bg-[#ccdcee]'],
  ['retainer', 'Monthly guidance', 'Ongoing sessions, evaluations and chat.', 'bg-[#ffe8a3]'],
]

function FacultyCard({ mentor, large = false }) {
  const prices = Object.values(mentor.prices || {})
  const from = prices.length ? Math.min(...prices) : null
  return (
    <Link to={`/mentors/${mentor.id}`}
      className={`group block rounded-[22px] border border-white bg-white p-4 shadow-[0_14px_40px_-28px_rgba(0,29,61,.5)] transition hover:-translate-y-1 hover:border-gold-300 hover:shadow-[0_20px_45px_-24px_rgba(0,29,61,.45)] ${large ? 'sm:p-5' : ''}`}>
      <div className="flex items-start gap-3.5">
        <Avatar name={mentor.name} initials={mentor.initials} hue={mentor.hue}
          photo={mentor.photo} size={large ? 54 : 44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[13.5px] font-extrabold text-ink-900">{mentor.name}</h3>
            {mentor.is_verified && <Icon.Shield size={13} className="shrink-0 text-nex-600" />}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-[10.5px] font-bold text-gold-700">
            <Icon.Cap size={11} /> Premium Faculty
          </p>
        </div>
        <Icon.Chevron size={15} className="mt-1 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-nex-600" />
      </div>
      <p className="mt-3 line-clamp-2 text-[11.5px] leading-relaxed text-ink-500">
        {mentor.headline}
      </p>
      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-3">
        <Stars value={mentor.rating} size={10} />
        {from !== null && (
          <span className="text-[11.5px] font-extrabold text-ink-800">from {inr(from)}</span>
        )}
      </div>
    </Link>
  )
}

export default function LandingSimple() {
  const [meta, setMeta] = useState(null)
  const [mentors, setMentors] = useState([])

  useEffect(() => {
    api.get('/meta').then(setMeta).catch(() => {})
    api.get('/mentors?category=faculty&sort=rating')
      .then(data => setMentors(data.results || []))
      .catch(() => {})
  }, [])

  const featured = mentors.slice(0, 6)

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* The first screen works like the dashboard reference: one contained
          workspace, a small tool rail, clear copy, and pastel faculty cards. */}
      <main>
        <section>
          <div className="relative">
            <div className="relative grid min-h-[600px] bg-[#f6f9fd] lg:grid-cols-[76px_minmax(0,.92fr)_minmax(420px,1.08fr)]">
              <aside className="hidden flex-col items-center border-r border-ink-100 bg-white py-7 lg:flex">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-gold-400">
                  <Icon.Grid size={17} />
                </span>
                <div className="mt-8 space-y-3">
                  {[Icon.User, Icon.Search, Icon.Calendar, Icon.Chat].map((Item, index) => (
                    <span key={index}
                      className={`grid h-9 w-9 place-items-center rounded-xl ${index === 1
                        ? 'bg-gold-100 text-gold-700' : 'text-ink-400'}`}>
                      <Item size={16} />
                    </span>
                  ))}
                </div>
              </aside>

              <div className="flex flex-col justify-center px-5 py-12 sm:px-8 lg:px-12 xl:px-16">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1.5 text-[10.5px] font-extrabold text-gold-800">
                  <Icon.Shield size={12} /> Verified UPSC mentorship
                </span>
                <h1 className="mt-6 max-w-xl text-[clamp(2.35rem,5vw,4.5rem)] font-extrabold leading-[.98] tracking-[-0.055em] text-ink-900">
                  Find the right faculty for your{' '}
                  <span className="relative whitespace-nowrap">
                    <span className="absolute inset-x-0 bottom-[.07em] h-[.2em] rounded-full bg-gold-300" />
                    <span className="relative">attempt</span>
                  </span>.
                </h1>
                <p className="mt-5 max-w-md text-[14px] leading-relaxed text-ink-500">
                  Book premium faculty for personal sessions, answer evaluation, and focused
                  guidance. Browse profiles before you sign up.
                </p>
                <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
                  <Button as={Link} to="/mentors?category=faculty" size="pilllg"
                    variant="dark" icon={<Icon.Search size={16} />}>
                    Explore premium faculty
                  </Button>
                  <Button as={Link} to="/login" size="pilllg" variant="outline">
                    Sign in
                  </Button>
                </div>
                <div className="mt-7 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {featured.slice(0, 4).map(m => (
                      <Avatar key={m.id} name={m.name} initials={m.initials}
                        hue={m.hue} photo={m.photo} size={30} ring />
                    ))}
                  </div>
                  <p className="text-[11.5px] font-semibold text-ink-500">
                    Manually verified profiles
                  </p>
                </div>
              </div>

              <div className="relative flex items-center bg-[#e6edf6] px-5 py-10 sm:px-8 lg:px-10 xl:px-14">
                <div className="dotgrid-light pointer-events-none absolute inset-0 opacity-40" />
                <div className="absolute right-6 top-7 flex items-center gap-2 text-[10.5px] font-bold text-ink-500 sm:right-8">
                  <span className="h-2 w-2 rounded-full bg-mint-500" />
                  Faculty available
                </div>
                <div className="relative grid w-full gap-3 pt-8 sm:grid-cols-2">
                  {featured.slice(0, 4).map((mentor, index) => (
                    <div key={mentor.id} className={index % 2 ? 'sm:translate-y-6' : ''}>
                      <FacultyCard mentor={mentor} />
                    </div>
                  ))}
                  {!featured.length && Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-40 animate-pulse rounded-[22px] bg-white" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium faculty is the first content after the hero. */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[.16em] text-gold-700">
                Premium faculty
              </p>
              <h2 className="mt-2 text-fluid-h2 font-extrabold text-ink-900">
                Learn from proven specialists.
              </h2>
            </div>
            <Link to="/mentors?category=faculty"
              className="inline-flex items-center gap-1 text-[12.5px] font-extrabold text-ink-700 hover:text-nex-600">
              View all faculty <Icon.Chevron size={14} />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured.map(mentor => <FacultyCard key={mentor.id} mentor={mentor} large />)}
          </div>
        </section>

        <section id="services" className="bg-ink-50 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-xl">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[.16em] text-gold-700">
                Choose what you need
              </p>
              <h2 className="mt-2 text-fluid-h2 font-extrabold text-ink-900">
                Four simple ways to get guidance.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICE_CARDS.map(([kind, title, body, color]) => {
                const ServiceIcon = SERVICE_ICON[kind]
                return (
                  <Link key={kind} to={`/mentors?service=${kind}`}
                    className={`${color} group rounded-[22px] p-5 transition hover:-translate-y-1`}>
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/75 text-ink-700">
                      <ServiceIcon size={18} />
                    </span>
                    <h3 className="mt-6 text-[14px] font-extrabold text-ink-900">{title}</h3>
                    <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-600">{body}</p>
                    <span className="mt-5 inline-flex items-center gap-1 text-[11.5px] font-extrabold text-ink-700">
                      Find mentors <Icon.Chevron size={12} />
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
          <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-start">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[.16em] text-gold-700">
                How it works
              </p>
              <h2 className="mt-2 text-fluid-h2 font-extrabold text-ink-900">
                Browse. Book. Improve.
              </h2>
              <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-ink-500">
                No long setup before you can explore. See faculty, pricing, and availability first.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                ['01', 'Choose verified faculty', 'Compare expertise, reviews, pricing and free slots.'],
                ['02', 'Book the right service', 'Pick a session, evaluation, live review or monthly plan.'],
                ['03', 'Pay safely', 'Your payment stays in escrow until the work is delivered.'],
              ].map(([number, title, body], index) => (
                <div key={number}
                  className={`flex gap-4 rounded-[20px] p-5 ${['bg-[#e8f1fa]', 'bg-[#fff5c6]', 'bg-[#dce8f6]'][index]}`}>
                  <span className="text-[12px] font-extrabold text-ink-400">{number}</span>
                  <div>
                    <h3 className="text-[14px] font-extrabold text-ink-900">{title}</h3>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-500">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20">
          <div className="relative mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 overflow-hidden rounded-[28px] bg-ink-900 px-7 py-10 text-center sm:flex-row sm:text-left">
            <div className="hatch pointer-events-none absolute inset-0" />
            <div className="relative">
              <h2 className="text-[24px] font-extrabold text-white">
                Ready to meet your <span className="text-gold-400">faculty</span>?
              </h2>
              <p className="mt-1.5 text-[12.5px] text-white/65">Browse freely. Create an account only when you book.</p>
            </div>
            <Button as={Link} to="/mentors?category=faculty" size="pilllg"
              className="relative !bg-gold-400 !text-ink-950 hover:!bg-gold-300">
              Explore faculty
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter meta={meta} />
    </div>
  )
}
