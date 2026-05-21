import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

// Google Client ID — Web client (auto created by Google Service)
const GOOGLE_CLIENT_ID = '263021632716-esq3clgbajg306ogo0i26eimsm5b4l22.apps.googleusercontent.com'

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: object) => void
          renderButton: (el: HTMLElement, config: object) => void
          prompt: () => void
        }
      }
    }
  }
}

export default function LoginPage() {
  const { login, loginWithGoogleToken, user } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  // Si ya hay sesión, redirigir
  useEffect(() => {
    if (user) nav('/projects', { replace: true })
  }, [user, nav])

  // Cargar Google Identity Services y renderizar el botón oficial
  useEffect(() => {
    const scriptId = 'gsi-script'
    if (document.getElementById(scriptId)) {
      initGoogle()
      return
    }
    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initGoogle
    document.head.appendChild(script)
  }, [])

  function initGoogle() {
    if (!window.google || !googleBtnRef.current) return
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response: { credential: string }) => {
        // response.credential ES el Google ID Token — igual que en Flutter
        setLoading(true)
        setError('')
        try {
          await loginWithGoogleToken(response.credential)
          nav('/projects')
        } catch {
          setError('Error al iniciar sesión con Google. Inténtalo de nuevo.')
        } finally {
          setLoading(false)
        }
      },
      ux_mode: 'popup',
    })
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: 312,
      locale: 'es',
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      nav('/projects')
    } catch {
      setError('Email o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ width: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 32 }}>🌿</span>
          <h1 style={{ fontSize: 22, color: 'var(--green)', marginTop: 4 }}>BioField</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Panel web</p>
        </div>

        {/* Botón oficial de Google — sin popup ni redirect problemáticos */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div ref={googleBtnRef} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0', color: 'var(--muted)', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          o
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: '#c62828', fontSize: 13, margin: 0 }}>{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}