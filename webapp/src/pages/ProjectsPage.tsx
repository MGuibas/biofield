import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import type { Project } from '../types'
import Navbar from '../components/Navbar'

export default function ProjectsPage() {
  const nav = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/projects').then(r => setProjects(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Navbar />
      <div className="page-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Mis proyectos</h1>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{projects.length} proyecto(s)</span>
        </div>

        {loading ? <div className="spinner" /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {projects.map(p => (
              <div key={p.id} className="card card-hover" onClick={() => nav(`/projects/${p.id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</h3>
                  {p.isArchived
                    ? <span className="badge badge-grey">Archivado</span>
                    : <span className="badge badge-green">Activo</span>
                  }
                </div>
                {p.description && (
                  <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.4 }}>{p.description}</p>
                )}
                <hr className="divider" style={{ margin: '10px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)' }}>
                  <span>👥 {p.memberCount} miembro(s)</span>
                  <span style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{p.shareCode}</span>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🌱</p>
                <p>Sin proyectos aún.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
