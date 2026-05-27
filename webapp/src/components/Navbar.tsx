import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { getAvatarUrl } from '../api'
import { Sprout, Settings, LogOut, Sun, Moon } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [avatarFailed, setAvatarFailed] = useState(false)

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    setAvatarFailed(false)
  }, [user?.avatarUrl])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const initials = user?.displayName?.[0]?.toUpperCase() ?? '?'

  return (
    <nav className="navbar">
      <div className="navbar-logo" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 18 }} onClick={() => nav('/projects')}>
        <Sprout size={20} color="var(--green)" /> BioField
      </div>
      <div className="navbar-spacer" />
      <div className="navbar-user" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {user?.role === 'Admin' && (
          <button className="btn-outline" onClick={() => nav('/admin')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 13, borderColor: 'var(--green)', color: 'var(--green)' }}>
            <Settings size={14} /> Panel Admin
          </button>
        )}
        <button 
          className="btn-ghost" 
          onClick={toggleTheme} 
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 8, color: 'var(--muted)' }}
          title={theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <span className="navbar-name" style={{ fontSize: 14, fontWeight: 600 }}>{user?.displayName}</span>
        <div className="avatar">
          {user?.avatarUrl && !avatarFailed ? (
            <img 
              src={getAvatarUrl(user.avatarUrl) ?? ''} 
              alt="" 
              referrerPolicy="no-referrer" 
              onError={() => setAvatarFailed(true)} 
            />
          ) : (
            initials
          )}
        </div>
        <button className="btn-outline" onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 13 }}>
          <LogOut size={13} /> Salir
        </button>
      </div>
    </nav>
  )
}
