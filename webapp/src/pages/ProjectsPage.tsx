import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import api from '../api'
import type { Project } from '../types'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import { 
  FolderOpen, CheckCircle2, Archive, Users, Search, 
  Plus, Link as LinkIcon, Crown, Copy, Check, FolderSearch, AlertTriangle 
} from 'lucide-react'

export default function ProjectsPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Search & Filters
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all')

  // Create Project Modal States
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  // Join Project Modal States
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinShareCode, setJoinShareCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)

  // Loading state for operations
  const [actionLoading, setActionLoading] = useState(false)

  // Copied code tooltip feedback state
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = () => {
    setLoading(true)
    api.get('/projects')
      .then(r => setProjects(r.data))
      .finally(() => setLoading(false))
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newProjectName.trim()) return

    try {
      setActionLoading(true)
      setCreateError(null)
      const res = await api.post('/projects', {
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || null,
        coverImageUrl: null
      })
      const newProj: Project = res.data
      setProjects(prev => [newProj, ...prev])
      setShowCreateModal(false)
      setNewProjectName('')
      setNewProjectDesc('')
    } catch (err: any) {
      setCreateError(err.response?.data || 'Error al crear el proyecto. Inténtalo de nuevo.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleJoinProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinShareCode.trim()) return

    try {
      setActionLoading(true)
      setJoinError(null)
      const res = await api.get(`/projects/join/${joinShareCode.trim()}`)
      const joinedProj: Project = res.data

      // Refresh project list to reflect correct membership stats
      fetchProjects()
      
      setShowJoinModal(false)
      setJoinShareCode('')
      alert(`¡Te has unido con éxito al proyecto "${joinedProj.name}"!`)
    } catch (err: any) {
      setJoinError(err.response?.data || 'Código de compartido inválido o error al unirse.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation()
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Quick statistics calculations
  const totalProjects = projects.length
  const activeProjects = projects.filter(p => !p.isArchived).length
  const archivedProjects = projects.filter(p => p.isArchived).length
  const colabProjects = projects.filter(p => p.ownerId !== user?.userId).length

  // Filter projects based on search query and status filter
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase())) ||
      p.shareCode.toLowerCase().includes(search.toLowerCase())

    if (filter === 'active') return matchesSearch && !p.isArchived
    if (filter === 'archived') return matchesSearch && p.isArchived
    return matchesSearch
  })

  return (
    <>
      <Navbar />
      <div className="page-content">
        {/* Title Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Mis Proyectos</h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 2 }}>Visualiza, organiza y exporta tus datos de biodiversidad y observaciones de campo.</p>
          </div>
        </div>

        {/* Global Stats Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius)',
              background: 'var(--green-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--green)',
              flexShrink: 0
            }}><FolderOpen size={20} /></div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{totalProjects}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>Proyectos Totales</p>
            </div>
          </div>

          <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius)',
              background: 'var(--green-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--green-mid)',
              flexShrink: 0
            }}><CheckCircle2 size={20} /></div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{activeProjects}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>Proyectos Activos</p>
            </div>
          </div>

          <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius)',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted)',
              flexShrink: 0
            }}><Archive size={20} /></div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{archivedProjects}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>Archivados</p>
            </div>
          </div>

          <div className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)' }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 'var(--radius)',
              background: '#e3f2fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1565c0',
              flexShrink: 0
            }}><Users size={20} /></div>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{colabProjects}</p>
              <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>Colaboraciones</p>
            </div>
          </div>
        </div>

        {/* Search, Filters and Actions Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
          background: 'var(--white)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow)',
          border: '1px solid var(--border)'
        }}>
          {/* Search box */}
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}><Search size={16} /></span>
            <input
              type="text"
              placeholder="Buscar por nombre, descripción o código..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 40, height: 40 }}
            />
          </div>

          {/* Filter Toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 3, borderRadius: 'var(--radius)' }}>
            {(['all', 'active', 'archived'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  background: filter === f ? 'var(--white)' : 'transparent',
                  color: filter === f ? 'var(--green)' : 'var(--muted)',
                  boxShadow: filter === f ? 'var(--shadow)' : 'none',
                  borderRadius: 'var(--radius)',
                  transition: 'all 0.15s ease'
                }}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Archivados'}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className="btn-outline" 
              onClick={() => setShowJoinModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', fontWeight: 600 }}
            >
              <LinkIcon size={14} /> Unirse a Proyecto
            </button>
            <button 
              className="btn-primary" 
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px', fontWeight: 600 }}
            >
              <Plus size={14} /> Crear Proyecto
            </button>
          </div>
        </div>

        {/* Project Card Grid */}
        {loading ? <div className="spinner" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filteredProjects.map(p => (
              <div 
                key={p.id} 
                className="card card-hover" 
                style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }} 
                onClick={() => nav(`/projects/${p.id}`)}
              >
                {/* Visual Header Banner */}
                <div style={{
                  height: 70,
                  background: p.isArchived 
                    ? 'linear-gradient(135deg, #78909c 0%, #37474f 100%)'
                    : 'linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%)',
                  position: 'relative',
                  borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px'
                }}>
                  {/* Decorative backgrounds */}
                  <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', top: -30, right: -20 }} />
                  
                  {/* Role Badge */}
                  {user?.userId === p.ownerId ? (
                    <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 'var(--radius)', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px' }}>
                      <Crown size={11} /> Propietario
                    </span>
                  ) : (
                    <span className="badge" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 'var(--radius)', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px' }}>
                      <Users size={11} /> Colaborador
                    </span>
                  )}

                  {/* Status Badge */}
                  <span className="badge" style={{
                    marginLeft: 'auto',
                    backgroundColor: p.isArchived ? 'rgba(0,0,0,0.3)' : 'rgba(255, 255, 255, 0.9)',
                    color: p.isArchived ? '#fff' : 'var(--green-dark)',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 'var(--radius)',
                    padding: '3px 8px'
                  }}>
                    {p.isArchived ? 'Archivado' : 'Activo'}
                  </span>
                </div>

                {/* Card Body */}
                <div style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h3>
                  
                  <p style={{
                    fontSize: 13,
                    color: 'var(--muted)',
                    margin: '0 0 16px 0',
                    lineHeight: 1.5,
                    height: 40,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {p.description || 'Sin descripción del proyecto.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}><Users size={14} /> {p.memberCount} {p.memberCount === 1 ? 'miembro' : 'miembros'}</span>
                    
                    <div 
                      onClick={(e) => handleCopyCode(e, p.shareCode)}
                      title="Copiar código de compartido"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontFamily: 'monospace',
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        color: copiedCode === p.shareCode ? 'var(--green)' : 'var(--text)',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow)'
                      }}
                    >
                      <span>{p.shareCode}</span>
                      {copiedCode === p.shareCode ? <Check size={12} /> : <Copy size={12} />}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredProjects.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 40px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <FolderSearch size={40} color="var(--muted)" style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>No se encontraron proyectos</h3>
                <p style={{ fontSize: 13 }}>Intenta ajustar tu búsqueda o crea un proyecto nuevo para comenzar a recolectar observaciones.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <Modal title="Crear Nuevo Proyecto" onClose={() => setShowCreateModal(false)} maxWidth={500}>
          <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {createError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#ffebee', color: '#c62828', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500 }}>
                <AlertTriangle size={15} /> {createError}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Nombre del Proyecto *</label>
              <input
                type="text"
                required
                placeholder="Ej: Biodiversidad de Aves del Bosque Templado"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Descripción</label>
              <textarea
                placeholder="Describe los objetivos, ubicación o detalles del proyecto..."
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                rows={4}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn-outline" onClick={() => setShowCreateModal(false)} disabled={actionLoading}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Creando...' : 'Crear Proyecto'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Join Project Modal */}
      {showJoinModal && (
        <Modal title="Unirse a un Proyecto" onClose={() => setShowJoinModal(false)} maxWidth={460}>
          <form onSubmit={handleJoinProject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {joinError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#ffebee', color: '#c62828', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500 }}>
                <AlertTriangle size={15} /> {joinError}
              </div>
            )}
            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              Introduce el código de compartido de 6 caracteres del proyecto al que deseas unirte. Este código te lo debe facilitar el propietario del proyecto.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Código de Compartido</label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="Escribir código, ej: XY1234"
                value={joinShareCode}
                onChange={e => setJoinShareCode(e.target.value.toUpperCase())}
                style={{
                  fontFamily: 'monospace',
                  letterSpacing: 3,
                  fontSize: 18,
                  textAlign: 'center',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn-outline" onClick={() => setShowJoinModal(false)} disabled={actionLoading}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={actionLoading}>
                {actionLoading ? 'Uniéndose...' : 'Unirse al Proyecto'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
