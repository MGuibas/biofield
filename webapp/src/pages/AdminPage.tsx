import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import api, { photoUrl, getAvatarUrl } from '../api'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import type { AdminUserSummary, AdminUserDetail } from '../types'
import { 
  FolderOpen, Search, Eye, Calendar, Clock, Briefcase, Building2, MapPin, Users
} from 'lucide-react'

export default function AdminPage() {
  const { user: currentUser } = useAuth()
  const nav = useNavigate()
  const [users, setUsers] = useState<AdminUserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/users')
      setUsers(res.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data || 'No se pudieron cargar los usuarios. Verifica que eres administrador.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (userId: string) => {
    try {
      setLoadingDetail(true)
      const res = await api.get(`/admin/users/${userId}/details`)
      setSelectedUserDetail(res.data)
    } catch (err) {
      alert('Error al cargar detalles del usuario.')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleToggleRole = async (user: AdminUserSummary) => {
    const newRole = user.role === 'Admin' ? 'User' : 'Admin'
    const confirmMsg = user.role === 'Admin' 
      ? `¿Estás seguro de que quieres quitarle el rol de Administrador a ${user.displayName}?` 
      : `¿Quieres convertir a ${user.displayName} en Administrador?`
      
    if (!confirm(confirmMsg)) return

    try {
      setUpdatingRole(user.id)
      await api.put(`/admin/users/${user.id}/role`, { role: newRole })
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
      
      // If we are currently viewing this user's details, update that too
      if (selectedUserDetail && selectedUserDetail.user.id === user.id) {
        setSelectedUserDetail(prev => prev ? {
          ...prev,
          user: { ...prev.user, role: newRole }
        } : null)
      }
    } catch (err: any) {
      alert(err.response?.data || 'Error al actualizar el rol.')
    } finally {
      setUpdatingRole(null)
    }
  }

  // Filter users based on search query
  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.speciality && u.speciality.toLowerCase().includes(search.toLowerCase())) ||
    (u.institution && u.institution.toLowerCase().includes(search.toLowerCase()))
  )

  // Quick statistics calculations
  const totalUsers = users.length
  const totalProjects = users.reduce((sum, u) => sum + u.projectCount, 0)
  const totalObservations = users.reduce((sum, u) => sum + u.observationCount, 0)

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="spinner" style={{ marginTop: 120 }} />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn-ghost" onClick={() => nav('/projects')} style={{ fontSize: 18, padding: '4px 8px' }}>←</button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Panel de Administración</h1>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>Gestiona usuarios, roles y consulta estadísticas generales de BioField.</p>
          </div>
        </div>

        {error && (
          <div className="card" style={{ borderLeft: '4px solid #d32f2f', marginBottom: 20, background: '#ffebee' }}>
            <p style={{ color: '#c62828', fontWeight: 500 }}>⚠️ Error: {error}</p>
          </div>
        )}

        {/* Global Stats Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
          <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'all 0.3s ease' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.12) 0%, rgba(46, 125, 50, 0.04) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--green)',
              flexShrink: 0
            }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{totalUsers}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>Usuarios Registrados</p>
            </div>
          </div>
          <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'all 0.3s ease' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(21, 101, 192, 0.12) 0%, rgba(21, 101, 192, 0.04) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1565c0',
              flexShrink: 0
            }}>
              <FolderOpen size={24} />
            </div>
            <div>
              <p style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{totalProjects}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>Proyectos Activos</p>
            </div>
          </div>
          <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'all 0.3s ease' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(239, 108, 0, 0.12) 0%, rgba(239, 108, 0, 0.04) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef6c00',
              flexShrink: 0
            }}>
              <Eye size={24} />
            </div>
            <div>
              <p style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{totalObservations}</p>
              <p style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginTop: 2 }}>Observaciones Totales</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
            <Search size={18} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar usuario por nombre, email, especialidad o institución..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ 
              width: '100%', 
              fontSize: 15, 
              padding: '14px 16px 14px 46px',
              borderRadius: '14px',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              outline: 'none',
              transition: 'all 0.25s ease'
            }}
          />
        </div>

        {/* Users Card Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredUsers.map(u => (
            <div 
              key={u.id} 
              className="card card-hover" 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between', 
                minHeight: 220,
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                padding: '20px',
                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                  <div 
                    className="avatar avatar-lg" 
                    style={{ 
                      width: 48, 
                      height: 48, 
                      fontSize: 18, 
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      background: 'linear-gradient(135deg, var(--green-light) 0%, rgba(46,125,50,0.2) 100%)',
                      color: 'var(--green)',
                      fontWeight: 700
                    }}
                  >
                    {u.avatarUrl ? (
                      <img 
                        src={getAvatarUrl(u.avatarUrl) ?? ''} 
                        alt={u.displayName} 
                        referrerPolicy="no-referrer" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerText = u.displayName[0]?.toUpperCase() ?? '?';
                          }
                        }}
                      />
                    ) : (
                      u.displayName[0]?.toUpperCase()
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <b style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.displayName}</b>
                      <span className={`badge ${u.role === 'Admin' ? 'badge-blue' : 'badge-grey'}`} style={{ fontSize: 10, padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                        {u.role}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{u.email}</p>
                  </div>
                </div>

                <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {(u.speciality || u.institution) && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Briefcase size={14} style={{ color: 'var(--muted)' }} /> 
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <b>{u.speciality || 'Generalist'}</b> {u.institution ? `en ${u.institution}` : ''}
                      </span>
                    </p>
                  )}
                  <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} style={{ color: 'var(--muted)' }} /> <span>Registrado: <b>{new Date(u.createdAt).toLocaleDateString()}</b></span>
                  </p>
                  {u.lastLogin && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} style={{ color: 'var(--muted)' }} /> <span>Último acceso: <b>{new Date(u.lastLogin).toLocaleDateString()}</b></span>
                    </p>
                  )}
                </div>
              </div>

              <div>
                {/* Stats indicators inside card */}
                <div style={{ display: 'flex', gap: 12, background: 'var(--bg)', padding: '10px 14px', borderRadius: '12px', marginBottom: 16, border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                      <FolderOpen size={15} style={{ color: 'var(--muted)' }} /> {u.projectCount}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Proyectos</span>
                  </div>
                  <div style={{ width: 1, background: 'var(--border)' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                      <Eye size={15} style={{ color: 'var(--muted)' }} /> {u.observationCount}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Obs.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    className="btn-outline" 
                    onClick={() => handleViewDetails(u.id)}
                    style={{ flex: 1, padding: '8px 14px', fontSize: 13, borderRadius: '10px', fontWeight: 600 }}
                  >
                    Ver detalles
                  </button>
                  {u.id !== currentUser?.userId && (
                    <button 
                      className={u.role === 'Admin' ? 'btn-outline' : 'btn-primary'} 
                      onClick={() => handleToggleRole(u)}
                      disabled={updatingRole === u.id}
                      style={{ 
                        padding: '8px 14px', 
                        fontSize: 13, 
                        borderRadius: '10px',
                        fontWeight: 600,
                        background: u.role === 'Admin' ? 'transparent' : 'var(--green)',
                        color: u.role === 'Admin' ? '#c62828' : '#fff',
                        borderColor: u.role === 'Admin' ? '#ef9a9a' : 'var(--green)',
                        flex: 1
                      }}
                    >
                      {updatingRole === u.id ? '...' : u.role === 'Admin' ? 'Quitar Admin' : 'Hacer Admin'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <p style={{ color: 'var(--muted)', gridColumn: '1/-1', textAlign: 'center', padding: 24 }}>No se encontraron usuarios.</p>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUserDetail && (
        <Modal 
          title={`Detalles de Usuario: ${selectedUserDetail.user.displayName}`} 
          onClose={() => setSelectedUserDetail(null)}
          maxWidth={820}
        >
          {/* Banner superior con gradiente de marca */}
          <div style={{
            background: 'linear-gradient(135deg, var(--green-dark) 0%, var(--green) 100%)',
            borderRadius: '16px',
            padding: '24px 28px',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: 24,
            boxShadow: '0 4px 20px rgba(46, 125, 50, 0.15)'
          }}>
            {/* Círculos decorativos de fondo */}
            <div style={{ position: 'absolute', right: -20, top: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)' }} />
            <div style={{ position: 'absolute', right: 80, bottom: -30, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.03)' }} />
            
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
              <div 
                className="avatar" 
                style={{ 
                  width: 72, 
                  height: 72, 
                  fontSize: 28, 
                  border: '3px solid rgba(255, 255, 255, 0.9)', 
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)', 
                  background: 'var(--white)',
                  color: 'var(--green)'
                }}
              >
                {selectedUserDetail.user.avatarUrl ? (
                  <img 
                    src={getAvatarUrl(selectedUserDetail.user.avatarUrl) ?? ''} 
                    alt="" 
                    referrerPolicy="no-referrer" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerText = selectedUserDetail.user.displayName[0]?.toUpperCase() ?? '?';
                      }
                    }}
                  />
                ) : (
                  selectedUserDetail.user.displayName[0]?.toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 22, fontWeight: 800, margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.15)', color: '#fff' }}>
                    {selectedUserDetail.user.displayName}
                  </h3>
                  <span className="badge" style={{ 
                    fontSize: 11, 
                    background: selectedUserDetail.user.role === 'Admin' ? '#e3f2fd' : 'rgba(255, 255, 255, 0.2)', 
                    color: selectedUserDetail.user.role === 'Admin' ? '#1565c0' : '#fff',
                    fontWeight: 700
                  }}>
                    {selectedUserDetail.user.role}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 4, fontWeight: 500 }}>{selectedUserDetail.user.email}</p>
                
                {(selectedUserDetail.user.speciality || selectedUserDetail.user.institution) && (
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>
                    {selectedUserDetail.user.speciality && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Briefcase size={12} /> Especialidad: <b>{selectedUserDetail.user.speciality}</b>
                      </span>
                    )}
                    {selectedUserDetail.user.institution && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Building2 size={12} /> Institución: <b>{selectedUserDetail.user.institution}</b>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: 22, color: 'var(--green)', display: 'flex', alignItems: 'center' }}><Calendar size={20} /></div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>Fecha Registro</p>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{new Date(selectedUserDetail.user.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: 22, color: 'var(--green)', display: 'flex', alignItems: 'center' }}><Clock size={20} /></div>
              <div>
                <p style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>Último Acceso</p>
                <p style={{ fontSize: 13, fontWeight: 600 }}>
                  {selectedUserDetail.user.lastLogin ? new Date(selectedUserDetail.user.lastLogin).toLocaleString() : 'Nunca'}
                </p>
              </div>
            </div>
          </div>

          {/* User Projects Section */}
          <p className="section-title">Proyectos en los que participa ({selectedUserDetail.projects.length})</p>
          <div style={{ marginBottom: 28 }}>
            {selectedUserDetail.projects.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--muted)', background: '#f8f9fa', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>El usuario no participa en ningún proyecto.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {selectedUserDetail.projects.map(p => {
                  const coverUrl = photoUrl(p.coverImageUrl);
                  return (
                    <div 
                      key={p.id} 
                      className="card card-hover" 
                      onClick={() => nav('/projects/' + p.id)}
                      style={{ 
                        padding: 0, 
                        overflow: 'hidden', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        border: '1px solid var(--border)', 
                        borderRadius: '12px',
                        background: 'var(--white)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ 
                        height: 120, 
                        background: coverUrl ? `url(${coverUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                        position: 'relative'
                      }}>
                        <span className={`badge ${p.role === 'Owner' ? 'badge-green' : 'badge-grey'}`} style={{ position: 'absolute', top: 10, right: 10, fontSize: 10 }}>
                          {p.role}
                        </span>
                      </div>
                      <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>{p.name}</h4>
                          {p.description && <p style={{ fontSize: 12, color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 32, margin: '0 0 8px 0' }}>{p.description}</p>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(p.createdAt).toLocaleDateString()}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--text)' }}><Eye size={12} /> {p.observationCount} obs.</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* User Observations Section */}
          <p className="section-title">Observaciones recientes ({selectedUserDetail.recentObservations.length})</p>
          <div>
            {selectedUserDetail.recentObservations.length === 0 ? (
              <p style={{ fontSize: 14, color: 'var(--muted)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>El usuario no ha registrado observaciones.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {selectedUserDetail.recentObservations.map(o => {
                  let photos: string[] = [];
                  if (o.photosJson) {
                    try {
                      photos = JSON.parse(o.photosJson);
                    } catch (e) {}
                  }
                  const hasPhotos = photos.length > 0;
                  
                  let tags: string[] = [];
                  if (o.tagsJson) {
                    try {
                      tags = JSON.parse(o.tagsJson);
                    } catch (e) {}
                  }

                  return (
                    <div 
                      key={o.id} 
                      className="card card-hover" 
                      onClick={() => nav('/projects/' + o.projectId, { state: { selectedObsId: o.id } })}
                      style={{ 
                        display: 'flex', 
                        gap: 18, 
                        padding: 16, 
                        flexWrap: 'wrap', 
                        border: '1px solid var(--border)',
                        borderRadius: '14px',
                        background: 'var(--white)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                        cursor: 'pointer'
                      }}
                    >
                      {hasPhotos && (
                        <div 
                          className="photo-thumb" 
                          style={{ 
                            width: 110, 
                            height: 110, 
                            borderRadius: '10px', 
                            cursor: 'pointer', 
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = photoUrl(photos[0]) ?? '';
                            if (!failedPhotos[url]) setLightbox(url);
                          }}
                        >
                          <img 
                            src={photoUrl(photos[0]) ?? ''} 
                            alt="" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} 
                            onError={(e) => {
                              const url = photoUrl(photos[0]) ?? '';
                              setFailedPhotos(prev => ({ ...prev, [url]: true }));
                              e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                              e.currentTarget.style.objectFit = 'contain';
                              e.currentTarget.style.padding = '24px';
                              e.currentTarget.style.background = 'var(--bg)';
                            }}
                          />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                            <div>
                              <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{o.title || o.taxonName}</h4>
                              {o.title && <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', margin: '2px 0 0 0' }}>{o.taxonName}</p>}
                            </div>
                            <span className="badge badge-grey" style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <FolderOpen size={11} /> {o.projectName}
                            </span>
                          </div>

                          {/* Descriptions & Notes */}
                          {(o.description || o.notes) && (
                            <div style={{ 
                              fontSize: 13, 
                              marginTop: 10, 
                              color: 'var(--text)', 
                              background: 'var(--bg)', 
                              padding: '10px 14px', 
                              borderRadius: '8px', 
                              borderLeft: '4px solid var(--green)',
                              borderTop: '1px solid var(--border)',
                              borderRight: '1px solid var(--border)',
                              borderBottom: '1px solid var(--border)',
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                            }}>
                              {o.description && <p style={{ margin: '0 0 6px 0', lineHeight: 1.4 }}><b>Descripción:</b> {o.description}</p>}
                              {o.notes && <p style={{ margin: 0, lineHeight: 1.4 }}><b>Notas:</b> {o.notes}</p>}
                            </div>
                          )}

                          {/* Environment / Weather Info */}
                          {(o.weatherCondition || o.temperature !== undefined || o.humidity !== undefined) && (
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10, fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>
                              {o.weatherCondition && <span style={{ background: 'rgba(0,0,0,0.03)', padding: '2px 8px', borderRadius: '6px' }}>🌦️ {o.weatherCondition}</span>}
                              {o.temperature !== undefined && <span style={{ background: 'rgba(0,0,0,0.03)', padding: '2px 8px', borderRadius: '6px' }}>🌡️ {o.temperature}°C</span>}
                              {o.humidity !== undefined && <span style={{ background: 'rgba(0,0,0,0.03)', padding: '2px 8px', borderRadius: '6px' }}>💧 {o.humidity}% humedad</span>}
                            </div>
                          )}

                          {/* Tags */}
                          {tags.length > 0 && (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                              {tags.map((t, idx) => (
                                <span key={idx} className="badge" style={{ fontSize: 10, padding: '2px 6px', background: 'var(--green-light)', color: 'var(--green)', borderRadius: '4px', fontWeight: 600 }}>#{t}</span>
                              ))}
                            </div>
                          )}

                          {/* Habitat details if available */}
                          {(o.habitatDescription || o.habitatPhotoUrl) && (
                            <div style={{ 
                              display: 'flex', 
                              gap: 12, 
                              marginTop: 12, 
                              padding: '10px 12px', 
                              background: 'rgba(46,125,50,0.02)', 
                              borderRadius: '8px', 
                              border: '1px dashed rgba(46,125,50,0.2)', 
                              alignItems: 'center' 
                            }}>
                              {o.habitatPhotoUrl && (() => {
                                const url = photoUrl(o.habitatPhotoUrl) ?? '';
                                return (
                                  <img 
                                    src={url} 
                                    alt="Hábitat" 
                                    style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }} 
                                    onClick={(e) => { e.stopPropagation(); if (!failedPhotos[url]) setLightbox(url); }}
                                    onError={(e) => {
                                      setFailedPhotos(prev => ({ ...prev, [url]: true }));
                                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                                      e.currentTarget.style.objectFit = 'contain';
                                      e.currentTarget.style.padding = '8px';
                                      e.currentTarget.style.background = 'var(--white)';
                                    }}
                                  />
                                );
                              })()}
                              {o.habitatDescription && (
                                <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>
                                  <b>Hábitat:</b> {o.habitatDescription}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10, fontWeight: 500 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(o.observedAt).toLocaleString()}</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {o.latitude.toFixed(4)}, {o.longitude.toFixed(4)} (×{o.quantity})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Modal>
      )}

      {loadingDetail && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="spinner" style={{ borderTopColor: 'var(--green)' }} />
        </div>
      )}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="lightbox" onClick={onClose}>
      <img src={src} alt="" onClick={e => e.stopPropagation()} />
    </div>
  )
}
