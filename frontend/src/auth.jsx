import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, setToken } from './api'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [booting, setBooting] = useState(true)

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setProfile(null); return null }
    try {
      const data = await api.get('/auth/me')
      setUser(data.user); setProfile(data.profile)
      return data
    } catch {
      setToken(null); setUser(null); setProfile(null)
      return null
    }
  }, [])

  useEffect(() => { refresh().finally(() => setBooting(false)) }, [refresh])

  const adopt = (data) => {
    setToken(data.token); setUser(data.user); setProfile(data.profile)
    return data
  }

  const value = useMemo(() => ({
    user, profile, booting,
    isMentor: user?.role === 'mentor',
    isStudent: user?.role === 'student',
    verified: profile?.verification_status === 'verified',
    login: async (email, password) => adopt(await api.post('/auth/login', { email, password })),
    joinStudent: async (p) => adopt(await api.post('/auth/register/student', p)),
    joinMentor: async (p) => adopt(await api.post('/auth/register/mentor', p)),
    logout: () => { setToken(null); setUser(null); setProfile(null) },
    setProfile, refresh,
  }), [user, profile, booting, refresh])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
