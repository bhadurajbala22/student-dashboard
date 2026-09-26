import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './auth'
import AppShell from './components/AppShell'
import PublicShell from './components/PublicShell'
import { Loading, ToastHost } from './components/ui'

import Landing from './pages/LandingSimple'
import Login from './pages/Login'
import Join from './pages/Join'
import JoinAspirant from './pages/JoinAspirant'
import JoinMentor from './pages/JoinMentor'

import Workspace from './pages/Workspace'
import Discover from './pages/Discover'
import Storefront from './pages/Storefront'
import Orders from './pages/Orders'
import Vault from './pages/Vault'
import Chat from './pages/Chat'
import AspirantProfile from './pages/AspirantProfile'

import MentorHome from './pages/MentorHome'
import Requests from './pages/Requests'
import Queue from './pages/Queue'
import Calendar from './pages/Calendar'
import MyStorefront from './pages/MyStorefront'
import Earnings from './pages/Earnings'
import Onboarding from './pages/Onboarding'

/* The review room pulls in pdf.js, which is most of the bundle and is only needed
   once someone actually opens a copy to mark. Splitting it out keeps the landing
   page and discovery light on a phone connection. */
const ReviewRoom = lazy(() => import('./pages/ReviewRoom'))

function Boot({ label }) {
  return <div className="grid min-h-screen place-items-center"><Loading label={label} /></div>
}

function Private({ children, roles }) {
  const { user, profile, booting } = useAuth()
  const location = useLocation()
  if (booting) return <Boot label="Opening your workspace" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />
  // an unverified mentor is parked on the setup flow until the storefront is live
  if (user.role === 'mentor' && profile?.verification_status !== 'verified'
      && !location.pathname.startsWith('/app/setup')) {
    return <Navigate to="/app/setup" replace />
  }
  return children
}

function PublicOnly({ children }) {
  const { user, booting } = useAuth()
  const location = useLocation()
  if (booting) return <Boot />
  if (user) {
    const next = new URLSearchParams(location.search).get('next')
    return <Navigate to={next && next.startsWith('/') ? next : '/app'} replace />
  }
  return children
}

/**
 * Browsing is open to everyone. A signed-in student gets the same page inside
 * the app shell, so links shared publicly keep working after they register.
 */
function Browseable({ children, appPath }) {
  const { user, booting } = useAuth()
  if (booting) return <Boot />
  if (user?.role === 'student') return <Navigate to={appPath} replace />
  if (user?.role === 'mentor') return <Navigate to="/app" replace />
  return children
}

function PublicMentor() {
  const { id } = useParams()
  return <Browseable appPath={`/app/mentors/${id}`}><Storefront /></Browseable>
}

function Home() {
  const { user } = useAuth()
  return user?.role === 'mentor' ? <MentorHome /> : <Workspace />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/join" element={<PublicOnly><Join /></PublicOnly>} />
        <Route path="/join/aspirant" element={<PublicOnly><JoinAspirant /></PublicOnly>} />
        <Route path="/join/mentor" element={<PublicOnly><JoinMentor /></PublicOnly>} />

        {/* ── open to visitors: browse everything before handing over details ── */}
        <Route element={<PublicShell />}>
          <Route path="/mentors" element={<Browseable appPath="/app/discover"><Discover /></Browseable>} />
          <Route path="/mentors/:id" element={<PublicMentor />} />
        </Route>

        <Route path="/app/setup" element={<Private roles={['mentor']}><Onboarding /></Private>} />

        <Route path="/app" element={<Private><AppShell /></Private>}>
          <Route index element={<Home />} />
          <Route path="discover" element={<Private roles={['student']}><Discover /></Private>} />
          <Route path="mentors/:id" element={<Private roles={['student']}><Storefront /></Private>} />
          <Route path="orders" element={<Orders />} />
          <Route path="vault" element={<Vault />} />
          <Route path="review/:orderId" element={
            <Suspense fallback={<Loading label="Opening the copy…" />}><ReviewRoom /></Suspense>
          } />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:threadId" element={<Chat />} />
          <Route path="profile" element={<AspirantProfile />} />

          <Route path="requests" element={<Private roles={['mentor']}><Requests /></Private>} />
          <Route path="queue" element={<Private roles={['mentor']}><Queue /></Private>} />
          <Route path="calendar" element={<Private roles={['mentor']}><Calendar /></Private>} />
          <Route path="storefront" element={<Private roles={['mentor']}><MyStorefront /></Private>} />
          <Route path="earnings" element={<Private roles={['mentor']}><Earnings /></Private>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastHost />
    </>
  )
}
