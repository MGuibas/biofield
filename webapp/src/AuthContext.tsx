import { createContext, useContext, useState, ReactNode } from 'react'
import type { User } from './types'
import api from './api'

interface AuthCtx {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('access_token')
    const displayName = localStorage.getItem('display_name')
    const userId = localStorage.getItem('user_id')
    if (token && userId) return { userId, displayName: displayName ?? '', accessToken: token, refreshToken: '' } as User
    return null
  })

  async function login(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password })
    const u: User = {
      userId: res.data.userId,
      displayName: res.data.displayName,
      avatarUrl: res.data.avatarUrl,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
    }
    localStorage.setItem('access_token', u.accessToken)
    localStorage.setItem('refresh_token', u.refreshToken)
    localStorage.setItem('user_id', u.userId)
    localStorage.setItem('display_name', u.displayName)
    setUser(u)
  }

  function logout() {
    api.delete('/auth/logout').catch(() => {})
    localStorage.clear()
    setUser(null)
  }

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
