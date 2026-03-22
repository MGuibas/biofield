import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { API_BASE } from '../api'

export default function Navbar() {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const baseUrl = API_BASE.replace('/api', '')

  return (
    <nav className="navbar">
      <div className="navbar-logo" style={{ cursor: 'pointer' }} onClick={() => nav('/projects')}>
        <span>🌿</span> BioField
      </div>
      <div className="navbar-spacer" />
      <div className="navbar-user">
        <span className="navbar-name">{user?.displayName}</span>
        <div className="avatar avatar-lg">
          {user?.avatarUrl
            ? <img src={`${baseUrl}${user.avatarUrl}`} alt="" />
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
