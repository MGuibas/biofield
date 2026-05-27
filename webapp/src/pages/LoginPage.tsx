import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { Sprout } from 'lucide-react'

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
  const { loginWithGoogleToken, user } = useAuth()
  const nav = useNavigate()
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="card" style={{ width: 360, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: '12px',
            background: 'var(--green-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--green)',
            marginBottom: 12
          }}>
            <Sprout size={32} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)', margin: 0, letterSpacing: '-0.02em' }}>BioField</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>Panel web</p>
        </div>

        {/* Botón oficial de Google */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          <div ref={googleBtnRef} style={{ height: 44 }} />
          {loading && <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 12 }}>Iniciando sesión...</p>}
          {error && <p style={{ color: '#c62828', fontSize: 13, marginTop: 12, textAlign: 'center', fontWeight: 500 }}>{error}</p>}
        </div>
      </div>
    </div>
  )
}