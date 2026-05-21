import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from './firebase'
import type { User } from './types'
import api from './api'

interface AuthCtx {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  loginWithGoogleToken: (idToken: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthCtx>(null!)

function restoreUser(): User | null {
  const token = localStorage.getItem('access_token')
  const userId = localStorage.getItem('user_id')
  const displayName = localStorage.getItem('display_name')
  if (token && userId) {
    return {
      userId,
      displayName: displayName ?? '',
      email: localStorage.getItem('email') ?? undefined,
      avatarUrl: localStorage.getItem('avatar_url') ?? undefined,
      accessToken: token,
      refreshToken: localStorage.getItem('refresh_token') ?? '',
      isGuest: localStorage.getItem('is_guest') === 'true',
      speciality: localStorage.getItem('speciality') ?? undefined,
      institution: localStorage.getItem('institution') ?? undefined,
      role: localStorage.getItem('role') ?? 'User',
    } as User
  }
  return null
}

async function saveUser(u: User) {
  localStorage.setItem('access_token', u.accessToken)
  localStorage.setItem('refresh_token', u.refreshToken)
  localStorage.setItem('user_id', u.userId)
  localStorage.setItem('display_name', u.displayName)
  if (u.email) localStorage.setItem('email', u.email)
  if (u.avatarUrl) localStorage.setItem('avatar_url', u.avatarUrl)
  if (u.speciality) localStorage.setItem('speciality', u.speciality)
  if (u.institution) localStorage.setItem('institution', u.institution)
  if (u.role) localStorage.setItem('role', u.role)
}

function clearUser() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user_id')
  localStorage.removeItem('display_name')
  localStorage.removeItem('email')
  localStorage.removeItem('avatar_url')
  localStorage.removeItem('speciality')
  localStorage.removeItem('institution')
  localStorage.removeItem('is_guest')
  localStorage.removeItem('role')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(restoreUser)

  useEffect(() => {
    if (user && !user.isGuest) {
      api.get('/auth/profile')
        .then(res => {
          setUser(prev => {
            if (!prev) return null
            const updated = {
              ...prev,
              displayName: res.data.displayName,
              email: res.data.email,
              avatarUrl: res.data.avatarUrl,
              speciality: res.data.speciality,
              institution: res.data.institution,
            }
            saveUser(updated)
            return updated
          })
        })
        .catch(err => {
          console.error("Failed to sync profile:", err)
        })
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    const u: User = {
      userId: res.data.userId,
      displayName: res.data.displayName,
      email: res.data.email,
      avatarUrl: res.data.avatarUrl,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      role: res.data.role,
    }
    await saveUser(u)
    setUser(u)
  }

  // Recibe el ID token de Google (igual que Flutter) y lo envía al backend
  const loginWithGoogleToken = async (idToken: string) => {
    const res = await api.post('/auth/google', { idToken })
    const u: User = {
      userId: res.data.userId,
      displayName: res.data.displayName,
      email: res.data.email,
      avatarUrl: res.data.avatarUrl,
      accessToken: res.data.accessToken,
      refreshToken: res.data.refreshToken,
      speciality: res.data.speciality,
      institution: res.data.institution,
      role: res.data.role,
    }
    await saveUser(u)
    setUser(u)
  }

  const logout = () => {
    api.delete('/auth/logout').catch(() => {})
    signOut(auth).catch(() => {})
    clearUser()
    setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, login, loginWithGoogleToken, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)