import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { getAvatarUrl } from '../api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  return (
    <nav className="navbar">
      <div className="navbar-logo" style={{ cursor: 'pointer' }} onClick={() => nav('/projects')}>
        <span>🌿</span> BioField
      </div>
      <div className="navbar-spacer" />
      <div className="navbar-user">
        {user?.role === 'Admin' && (
          <button className="btn-outline" onClick={() => nav('/admin')} style={{ padding: '6px 14px', fontSize: 13, marginRight: 8, borderColor: 'var(--green)', color: 'var(--green)' }}>
            ⚙️ Panel Admin
          </button>
        )}
        <span className="navbar-name">{user?.displayName}</span>
        <div className="avatar avatar-lg">
          {user?.avatarUrl
            ? <img src={getAvatarUrl(user.avatarUrl) ?? ''} alt="" />
            : user?.displayName?.[0]?.toUpperCase() ?? '?'
          }
        </div>
        <button className="btn-outline" onClick={logout} style={{ padding: '6px 14px', fontSize: 13 }}>
          Salir
        </button>
      </div>
    </nav>
  )
}
