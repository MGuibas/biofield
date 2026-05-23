import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { photoUrl, getAvatarUrl } from '../api'
import type { ProjectDetail, Observation, Route, Note, ActivityItem, Comment, ProjectStats } from '../types'
import ProjectMap from '../components/ProjectMap'
import Route3DModal from '../components/Route3DModal'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import StatsTab from '../components/StatsTab'

const TABS = ['🗺 Mapa', '🔬 Observaciones', '📍 Rutas', '📝 Notas', '📊 Stats', '⚡ Actividad', '👥 Miembros']

function parseList(json?: string): string[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

function duration(start: string, end?: string) {
  if (!end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
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

function ObsModal({ obs, onClose }: { obs: Observation; onClose: () => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)
  const photos = parseList(obs.photosJson)
  const tags = parseList(obs.tagsJson)

  useEffect(() => {
    api.get(`/observations/${obs.id}/comments`)
      .then(r => setComments(r.data))
      .finally(() => setLoadingComments(false))
  }, [obs.id])

  return (
    <>
      <Modal title={`Detalle de Observación`} onClose={onClose}>
        {/* Banner with taxon name */}
        <div style={{
          background: 'linear-gradient(135deg, var(--green-dark) 0%, var(--green) 100%)',
          padding: '18px 20px',
          color: '#fff',
          borderRadius: 12,
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -40, right: -20 }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{obs.title ?? obs.taxonName}</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', margin: '4px 0 0 0' }}>{obs.taxonName}</p>
        </div>

        {photos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p className="section-title">Fotos ({photos.length})</p>
            <div className="photo-grid">
              {photos.map((p, i) => (
                <div key={i} className="photo-thumb" style={{ borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }} onClick={() => setLightbox(photoUrl(p) ?? '')}>
                  <img src={photoUrl(p) ?? ''} alt="" />
                </div>
              ))}
            </div>
          </div>
        )}

        {obs.description && (
          <div style={{ marginBottom: 20 }}>
            <p className="section-title">Descripción</p>
            <p style={{ fontSize: 14, color: 'var(--text)', background: 'var(--bg)', padding: '12px 16px', borderRadius: 10, lineHeight: 1.6, borderLeft: '3px solid var(--green)' }}>
              {obs.description}
            </p>
          </div>
        )}

        {/* Observation Data Grid */}
        <p className="section-title">Información de Campo</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 20
        }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>FECHA Y HORA</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'block' }}>
              📅 {new Date(obs.observedAt).toLocaleString()}
            </span>
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>UBICACIÓN (LAT, LNG)</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'block' }}>
              📍 {obs.latitude.toFixed(5)}, {obs.longitude.toFixed(5)}
            </span>
          </div>
          {obs.altitude != null && (
            <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>ALTITUD</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'block' }}>
                ⛰️ {obs.altitude.toFixed(0)} m
              </span>
            </div>
          )}
          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>CANTIDAD INDIVIDUOS</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'block' }}>
              🔢 × {obs.quantity}
            </span>
          </div>
          {obs.weatherCondition && (
            <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>CLIMA</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'block' }}>
                🌤️ {obs.weatherCondition}
              </span>
            </div>
          )}
          {(obs.temperature != null || obs.humidity != null) && (
            <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>METEOROLOGÍA</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'block' }}>
                {obs.temperature != null ? `🌡️ ${obs.temperature}°C` : ''} {obs.humidity != null ? `💧 ${obs.humidity}%` : ''}
              </span>
            </div>
          )}
        </div>

        {obs.notes && (
          <div style={{ marginBottom: 20 }}>
            <p className="section-title">Notas de Observador</p>
            <p style={{ fontSize: 14, background: '#fff9c4', color: '#5d4037', padding: '12px 16px', borderRadius: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6, borderLeft: '3px solid #fbc02d', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {obs.notes}
            </p>
          </div>
        )}

        {(obs.habitatDescription || obs.habitatPhotoUrl) && (
          <div style={{ marginBottom: 20 }}>
            <p className="section-title">Hábitat</p>
            <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: 14, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {obs.habitatDescription && (
                <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{obs.habitatDescription}</p>
              )}
              {obs.habitatPhotoUrl && (
                <div 
                  className="photo-thumb" 
                  style={{ width: 140, height: 140, borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow)' }} 
                  onClick={() => setLightbox(photoUrl(obs.habitatPhotoUrl) ?? '')}
                >
                  <img src={photoUrl(obs.habitatPhotoUrl) ?? ''} alt="hábitat" />
                </div>
              )}
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {tags.map(t => <span key={t} className="badge badge-blue" style={{ fontWeight: 600 }}>🏷️ {t}</span>)}
          </div>
        )}

        <hr className="divider" />
        
        {/* Comments Section */}
        <p className="section-title">Comentarios de la Comunidad</p>
        {loadingComments ? (
          <div className="spinner" style={{ width: 20, height: 20, margin: '16px auto', borderWidth: 2 }} />
        ) : comments.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>Sin comentarios aún sobre esta observación.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div className="avatar" style={{ flexShrink: 0, border: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--green-light) 0%, rgba(46, 125, 50, 0.05) 100%)' }}>
                  {c.avatarUrl ? <img src={getAvatarUrl(c.avatarUrl) ?? ''} alt="" /> : c.displayName[0]?.toUpperCase()}
                </div>
                <div className="card" style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <b style={{ fontSize: 13, color: 'var(--text)' }}>{c.displayName}</b>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{relTime(c.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)' }}>{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}

function calculateDistanceMeters(points: { lat: number; lon: number }[]): number {
  let dist = 0
  const R = 6371000 // Earth radius in meters
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]
    const p2 = points[i + 1]
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
    const dLon = ((p2.lon - p1.lon) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    dist += R * c
  }
  return dist
}

function RouteModal({
  route,
  obsInRoute,
  onClose,
  onObsClick,
  onRefresh
}: {
  route: Route
  obsInRoute: Observation[]
  onClose: () => void
  onObsClick?: (obs: Observation) => void
  onRefresh?: () => void
}) {
  const [selObs, setSelObs] = useState<Observation | null>(null)
  const [showFlight3D, setShowFlight3D] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editedRoute, setEditedRoute] = useState<Route | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isEditing) {
      setEditedRoute(route)
    } else {
      setEditedRoute(null)
    }
    setErrorMsg(null)
  }, [isEditing, route])

  const handleRoutePointsChange = (newPoints: { lat: number; lon: number }[]) => {
    const distance = calculateDistanceMeters(newPoints)
    setEditedRoute(prev => {
      if (!prev) return null
      return {
        ...prev,
        distanceMeters: distance,
        trackPointsJson: JSON.stringify(newPoints)
      }
    })
  }

  const handleSave = async () => {
    if (!editedRoute) return
    if (!editedRoute.name.trim()) {
      setErrorMsg('El nombre de la ruta no puede estar vacío.')
      return
    }
    setSaving(true)
    setErrorMsg(null)
    try {
      await api.put(`/routes/${route.id}`, {
        name: editedRoute.name,
        endedAt: editedRoute.endedAt,
        distanceMeters: editedRoute.distanceMeters,
        trackPointsJson: editedRoute.trackPointsJson,
        notes: editedRoute.notes
      })
      setIsEditing(false)
      onRefresh?.()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.response?.data?.message || 'Error al guardar los cambios de la ruta.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('¿Seguro que quieres eliminar esta ruta? Las observaciones asociadas no se borrarán, pero dejarán de estar vinculadas.')) {
      return
    }
    setDeleting(true)
    setErrorMsg(null)
    try {
      await api.delete(`/routes/${route.id}`)
      onClose()
      onRefresh?.()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.response?.data?.message || 'Error al eliminar la ruta.')
    } finally {
      setDeleting(false)
    }
  }

  const dur = duration(route.startedAt, route.endedAt)

  return (
    <>
      <Modal title={`Detalle de Ruta`} onClose={onClose} maxWidth={860}>
        {/* Banner */}
        {isEditing ? (
          <div style={{
            background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)',
            padding: '18px 20px',
            color: '#fff',
            borderRadius: 12,
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>✏️ Editar Detalles de Ruta</h3>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>NOMBRE DE LA RUTA</label>
              <input 
                type="text" 
                value={editedRoute?.name || ''} 
                onChange={e => setEditedRoute(prev => prev ? { ...prev, name: e.target.value } : null)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>NOTAS / DESCRIPCIÓN</label>
              <textarea 
                value={editedRoute?.notes || ''} 
                onChange={e => setEditedRoute(prev => prev ? { ...prev, notes: e.target.value } : null)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 13,
                  minHeight: 60,
                  maxHeight: 120,
                  resize: 'vertical',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, #1565c0 0%, #1e88e5 100%)',
            padding: '18px 20px',
            color: '#fff',
            borderRadius: 12,
            marginBottom: 20,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -40, right: -20 }} />
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>📍 {route.name}</h3>
            <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>📅 {new Date(route.startedAt).toLocaleString()}</span>
              {route.endedAt && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>🏁 Fin: {new Date(route.endedAt).toLocaleString()}</span>}
            </div>
          </div>
        )}

        {/* Route Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>DISTANCIA RECORRIDA</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'block' }}>
              📏 {(((isEditing && editedRoute) ? editedRoute.distanceMeters : route.distanceMeters) / 1000).toFixed(2)} km
            </span>
          </div>
          {dur && (
            <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>DURACIÓN DE RUTA</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'block' }}>
                ⏱️ {dur}
              </span>
            </div>
          )}
          <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>OBSERVACIONES EN RUTA</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 2, display: 'block' }}>
              🔬 {obsInRoute.length} observada(s)
            </span>
          </div>
        </div>

        {!isEditing && route.notes && (
          <div style={{ marginBottom: 20 }}>
            <p className="section-title">Notas de Ruta</p>
            <p style={{ fontSize: 14, background: 'var(--bg)', padding: '12px 16px', borderRadius: 10, color: 'var(--text)', lineHeight: 1.6, borderLeft: '3px solid #1565c0' }}>
              {route.notes}
            </p>
          </div>
        )}

        {errorMsg && (
          <div style={{ background: '#ffebee', color: '#c62828', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <p className="section-title" style={{ margin: 0 }}>
            {isEditing ? 'Mapeo Interactivo de Recorrido' : 'Mapa de Recorrido'}
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isEditing && (
              <>
                <button 
                  onClick={() => setShowFlight3D(true)}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#1565c0',
                    borderRadius: '8px'
                  }}
                >
                  🚀 Iniciar Vuelo 3D
                </button>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#2e7d32',
                    borderRadius: '8px'
                  }}
                >
                  ✏️ Editar Puntos
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#d32f2f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: deleting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {deleting ? '🗑️ Eliminando...' : '🗑️ Eliminar'}
                </button>
              </>
            )}
            {isEditing && (
              <>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#2e7d32',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? '💾 Guardando...' : '💾 Guardar Cambios'}
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: '#757575',
                    borderRadius: '8px'
                  }}
                >
                  ❌ Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {isEditing && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            borderLeft: '4px solid #3b82f6',
            color: '#1e3a8a',
            padding: '10px 14px',
            borderRadius: '6px',
            fontSize: '12.5px',
            marginBottom: 12,
            fontWeight: 500
          }}>
            ℹ️ <b>Modo Edición Activo:</b> Puedes hacer clic y arrastrar los puntos azules del recorrido en el mapa para modificar la ruta. La distancia se recalculará automáticamente.
          </div>
        )}

        <div style={{ marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <ProjectMap 
            observations={obsInRoute} 
            routes={isEditing && editedRoute ? [editedRoute] : [route]} 
            height={340} 
            isRouteEditMode={isEditing}
            onRoutePointsChange={handleRoutePointsChange}
          />
        </div>

        {showFlight3D && (
          <Route3DModal
            route={route}
            obsInRoute={obsInRoute}
            onClose={() => setShowFlight3D(false)}
            onObsClick={(obs) => {
              onObsClick?.(obs);
            }}
          />
        )}

        {obsInRoute.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <p className="section-title">Listado de Observaciones ({obsInRoute.length})</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {obsInRoute.map(o => {
                const photos = parseList(o.photosJson)
                return (
                  <div 
                    key={o.id} 
                    className="card card-hover" 
                    style={{ display: 'flex', gap: 12, padding: 10, alignItems: 'center', border: '1px solid var(--border)', borderRadius: 12 }} 
                    onClick={() => setSelObs(o)}
                  >
                    {photos[0] ? (
                      <img src={photoUrl(photos[0]) ?? ''} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 50, height: 50, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        🔬
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <b style={{ fontSize: 13, display: 'block', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.title ?? o.taxonName}
                      </b>
                      <p style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic', margin: '2px 0 0 0' }}>{o.taxonName}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
      {selObs && <ObsModal obs={selObs} onClose={() => setSelObs(null)} />}
    </>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [tab, setTab] = useState(0)
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [obs, setObs] = useState<Observation[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [statsError, setStatsError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selObs, setSelObs] = useState<Observation | null>(null)
  const [selRoute, setSelRoute] = useState<Route | null>(null)

  // Copy code feedback state
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const [editMode, setEditMode] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)

  const handleExport = async (format: string) => {
    if (!id) return
    setExportingFormat(format)
    setToast({ type: 'success', message: `Iniciando exportación a ${format.toUpperCase()}...` })
    try {
      const mimes: Record<string, string> = {
        csv: 'text/csv',
        geojson: 'application/geo+json',
        gpx: 'application/gpx+xml',
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
      const exts: Record<string, string> = { csv: 'csv', geojson: 'geojson', gpx: 'gpx', pdf: 'pdf', excel: 'xlsx' }
      const res = await api.get(`/projects/${id}/export`, {
        params: { format },
        responseType: 'blob'
      })
      
      const blob = new Blob([res.data], { type: mimes[format] || 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `biofield_${format}.${exts[format] || format}`
      a.click()
      URL.revokeObjectURL(url)
      
      setToast({ type: 'success', message: `Exportación ${format.toUpperCase()} completada.` })
      setTimeout(() => setToast(null), 3000)
    } catch (err: any) {
      console.error(err)
      let errorMsg = 'Error al exportar los datos.'
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          const json = JSON.parse(text)
          if (json.message) errorMsg = json.message
        } catch {}
      } else if (err.message) {
        errorMsg = err.message
      }
      setToast({ type: 'error', message: `Error (${format.toUpperCase()}): ${errorMsg}` })
      setTimeout(() => setToast(null), 5000)
    } finally {
      setExportingFormat(null)
    }
  }

  const handleObservationMove = async (obsId: string, lat: number, lng: number) => {
    try {
      await api.patch(`/observations/${obsId}/coordinates`, {
        latitude: lat,
        longitude: lng
      })
      setObs(prevObs => prevObs.map(o => o.id === obsId ? { ...o, latitude: lat, longitude: lng } : o))
      setToast({ type: 'success', message: 'Ubicación actualizada correctamente.' })
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      console.error(err)
      setToast({ type: 'error', message: 'Error al actualizar la ubicación.' })
      setTimeout(() => setToast(null), 3000)
      
      // Revert position by refetching observations from backend
      api.get(`/projects/${id}/observations`, { params: { page: 1, pageSize: 200 } })
        .then(o => setObs(o.data.items ?? []))
    }
  }

  const refreshRoutes = async () => {
    if (!id) return
    try {
      const [r, o, s] = await Promise.all([
        api.get(`/projects/${id}/routes`),
        api.get(`/projects/${id}/observations`, { params: { page: 1, pageSize: 200 } }),
        api.get(`/projects/${id}/observations/stats`).catch(() => null)
      ])
      setRoutes(r.data)
      setObs(o.data.items ?? [])
      if (s) setStats(s.data)
      if (selRoute) {
        const updated = r.data.find((x: Route) => x.id === selRoute.id)
        if (updated) setSelRoute(updated)
      }
    } catch (err) {
      console.error('Error refreshing project routes/obs:', err)
    }
  }

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/observations`, { params: { page: 1, pageSize: 200 } }),
      api.get(`/projects/${id}/routes`),
      api.get(`/projects/${id}/notes`),
      api.get(`/projects/${id}/observations/activity`),
    ]).then(([d, o, r, n, a]) => {
      setDetail({ ...d.data, members: d.data.members ?? [] })
      setObs(o.data.items ?? [])
      setRoutes(r.data)
      setNotes(n.data)
      setActivity(a.data)
    }).finally(() => setLoading(false))

    api.get(`/projects/${id}/observations/stats`)
      .then(s => setStats(s.data))
      .catch(() => setStatsError(true))
  }, [id])

  if (loading) return <><Navbar /><div className="spinner" style={{ marginTop: 100 }} /></>
  if (!detail) return <><Navbar /><p style={{ padding: 40 }}>Proyecto no encontrado.</p></>

  return (
    <>
      <Navbar />
      <div className="page-content">
        {/* Premium Banner Header */}
        <div className="card" style={{
          padding: 0,
          overflow: 'hidden',
          borderRadius: 16,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          marginBottom: 24
        }}>
          {/* Header Banner */}
          <div style={{
            background: detail.isArchived
              ? 'linear-gradient(135deg, #78909c 0%, #37474f 100%)'
              : 'linear-gradient(135deg, var(--green-dark) 0%, var(--green) 100%)',
            padding: '24px 28px',
            position: 'relative',
            color: '#fff',
            overflow: 'hidden'
          }}>
            {/* Background elements */}
            <div style={{ position: 'absolute', width: 250, height: 250, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', top: -100, right: -40 }} />
            <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', bottom: -50, right: 180 }} />
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative', zIndex: 1 }}>
              <button 
                className="btn-ghost" 
                onClick={() => nav('/projects')} 
                style={{
                  fontSize: 14,
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.15)',
                  color: '#fff',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontWeight: 600
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
              >
                ← Volver
              </button>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>{detail.name}</h1>
                  {detail.isArchived ? (
                    <span className="badge" style={{ backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, fontWeight: 700 }}>Archivado</span>
                  ) : (
                    <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700 }}>Activo</span>
                  )}
                </div>
                {detail.description && (
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6, maxWidth: 800, lineHeight: 1.5 }}>
                    {detail.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Header Actions Row (Share Code & Exports) */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            background: 'var(--white)',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Código de Compartido:</span>
              <div 
                onClick={() => {
                  navigator.clipboard.writeText(detail.shareCode)
                  setCopiedCode(detail.shareCode)
                  setTimeout(() => setCopiedCode(null), 2000)
                }}
                title="Copiar código de compartido"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'monospace',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  padding: '5px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  color: copiedCode === detail.shareCode ? 'var(--green)' : 'var(--text)',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <span>{detail.shareCode}</span>
                <span>{copiedCode === detail.shareCode ? '✅' : '📋'}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginRight: 4 }}>Exportar datos:</span>
              {(['csv','geojson','gpx','pdf','excel'] as const).map(fmt => {
                const isThisExporting = exportingFormat === fmt;
                return (
                  <button 
                    key={fmt} 
                    className="btn-outline" 
                    disabled={exportingFormat !== null}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: exportingFormat !== null ? 0.6 : 1,
                      cursor: exportingFormat !== null ? 'not-allowed' : 'pointer'
                    }}
                    onClick={() => handleExport(fmt)}
                  >
                    <span>{isThisExporting ? '⏳' : '⬇️'}</span> {fmt.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Project Key Metrics Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Observaciones', value: obs.length, icon: '🔬', bg: 'linear-gradient(135deg, rgba(46, 125, 50, 0.12) 0%, rgba(46, 125, 50, 0.04) 100%)', color: 'var(--green)' },
            { label: 'Rutas', value: routes.length, icon: '📍', bg: 'linear-gradient(135deg, rgba(21, 101, 192, 0.12) 0%, rgba(21, 101, 192, 0.04) 100%)', color: '#1565c0' },
            { label: 'Notas', value: notes.length, icon: '📝', bg: 'linear-gradient(135deg, rgba(245, 124, 0, 0.12) 0%, rgba(245, 124, 0, 0.04) 100%)', color: '#f57c00' },
            { label: 'Miembros', value: detail.members.length, icon: '👥', bg: 'linear-gradient(135deg, rgba(124, 77, 255, 0.12) 0%, rgba(124, 77, 255, 0.04) 100%)', color: '#7c4dff' },
          ].map(s => (
            <div key={s.label} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', border: '1px solid var(--border)', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: s.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: s.color,
                flexShrink: 0
              }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{s.value}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs Bar */}
        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={t} className={`tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {/* Tab Contents */}
        {tab === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--white)',
              border: '1px solid var(--border)',
              padding: '12px 18px',
              borderRadius: 12,
              boxShadow: 'var(--shadow)',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  🗺️ Mapa del Proyecto
                </h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '2px 0 0 0' }}>
                  {editMode 
                    ? 'Modo edición activo. Arrastra los marcadores de las observaciones para reubicarlas.' 
                    : 'Visualiza la distribución geográfica de observaciones y rutas.'}
                </p>
              </div>
              <button 
                className={editMode ? 'btn-primary' : 'btn-outline'}
                onClick={() => setEditMode(!editMode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: 10,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  border: editMode ? '1px solid var(--green-dark)' : '1px solid var(--border)',
                  boxShadow: editMode ? '0 2px 8px rgba(46, 125, 50, 0.2)' : 'none'
                }}
              >
                <span>{editMode ? '🔒 Finalizar Edición' : '🔓 Editar Ubicaciones'}</span>
              </button>
            </div>
            
            <ProjectMap 
              observations={obs} 
              routes={routes} 
              height={520} 
              onObsClick={setSelObs} 
              editMode={editMode}
              onObservationMove={handleObservationMove}
            />
          </div>
        )}

        {tab === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
            {obs.map(o => {
              const photos = parseList(o.photosJson)
              return (
                <div 
                  key={o.id} 
                  className="card card-hover" 
                  style={{ display: 'flex', flexDirection: 'column', padding: 14, border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}
                  onClick={() => setSelObs(o)}
                >
                  {/* Photo container */}
                  {photos[0] ? (
                    <div style={{ width: '100%', height: 160, borderRadius: 10, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                      <img src={photoUrl(photos[0]) ?? ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {photos.length > 1 && (
                        <span className="badge" style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, backdropFilter: 'blur(4px)', fontWeight: 700 }}>
                          📸 +{photos.length - 1} fotos
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: 160, borderRadius: 10, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 32 }}>
                      🔬
                    </div>
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {o.title ?? o.taxonName}
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', margin: '2px 0 10px 0' }}>{o.taxonName}</p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>📅 {new Date(o.observedAt).toLocaleDateString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🔢 Cant: {o.quantity}</span>
                      {o.temperature != null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🌡️ {o.temperature}°C</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {obs.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>🔬</p>
                <p>Sin observaciones registradas en este proyecto.</p>
              </div>
            )}
          </div>
        )}

        {tab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {routes.map(r => {
              const dur = duration(r.startedAt, r.endedAt)
              const obsCount = obs.filter(o => o.routeId === r.id).length
              return (
                <div 
                  key={r.id} 
                  className="card card-hover" 
                  style={{ display: 'flex', flexDirection: 'column', padding: 16, border: '1px solid var(--border)', borderRadius: 14 }}
                  onClick={() => setSelRoute(r)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>📍 {r.name}</h4>
                      <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, color: 'var(--muted)' }}>📅 {new Date(r.startedAt).toLocaleString()}</span>
                        {dur && <span style={{ fontSize: 13, color: 'var(--muted)' }}>⏱️ Duración: {dur}</span>}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                      {obsCount > 0 && (
                        <span className="badge badge-green" style={{ fontWeight: 600 }}>🔬 {obsCount} obs.</span>
                      )}
                      <span className="badge badge-blue" style={{ fontWeight: 600 }}>📏 {(r.distanceMeters / 1000).toFixed(2)} km</span>
                    </div>
                  </div>
                  {r.notes && (
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, borderLeft: '3px solid var(--green)' }}>
                      {r.notes}
                    </p>
                  )}
                </div>
              )
            })}
            {routes.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>📍</p>
                <p>Sin rutas grabadas en este proyecto.</p>
              </div>
            )}
          </div>
        )}

        {tab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map(n => (
              <div key={n.id} className="card" style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text)' }}>📝 {n.title}</h4>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>📅 {new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text)' }}>{n.body}</p>
                {n.latitude != null && n.longitude != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'var(--muted)', background: 'var(--bg)', padding: '4px 10px', borderRadius: 6, alignSelf: 'flex-start' }}>
                    <span>📍 Coordenadas: {n.latitude.toFixed(5)}, {n.longitude.toFixed(5)}</span>
                  </div>
                )}
              </div>
            ))}
            {notes.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>📝</p>
                <p>Sin notas registradas en este proyecto.</p>
              </div>
            )}
          </div>
        )}

        {tab === 4 && (
          statsError
            ? <p style={{ color: 'var(--muted)', padding: 20 }}>No se pudieron cargar las estadísticas.</p>
            : stats ? <StatsTab stats={stats} /> : <div className="spinner" />
        )}

        {tab === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activity.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div className="avatar avatar-lg" style={{ border: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--green-light) 0%, rgba(46, 125, 50, 0.05) 100%)' }}>
                  {a.avatarUrl ? <img src={getAvatarUrl(a.avatarUrl) ?? ''} alt="" /> : a.actorName[0]?.toUpperCase()}
                </div>
                <div className="card" style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
                  <p style={{ fontSize: 14, margin: 0, color: 'var(--text)' }}><b>{a.actorName}</b> {a.description}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, margin: 0 }}>{relTime(a.occurredAt)}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p style={{ color: 'var(--muted)' }}>Sin actividad reciente.</p>}
          </div>
        )}

        {tab === 6 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
            {detail.members.map(m => (
              <div 
                key={m.userId} 
                className="card card-hover" 
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', border: '1px solid var(--border)', borderRadius: 14 }}
              >
                <div className="avatar avatar-lg" style={{ border: '2px solid var(--green-light)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, var(--green-light) 0%, rgba(46, 125, 50, 0.05) 100%)' }}>
                  {m.avatarUrl ? (
                    <img src={getAvatarUrl(m.avatarUrl) ?? ''} alt="" />
                  ) : (
                    m.displayName[0]?.toUpperCase()
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14, display: 'block', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.displayName}</b>
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Se unió: {new Date(m.joinedAt).toLocaleDateString()}</p>
                </div>
                
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  textTransform: 'capitalize',
                  ...(
                    m.role === 'owner' ? { background: 'rgba(245,158,11,0.15)', color: '#b45309', border: '1px solid rgba(245,158,11,0.35)' } :
                    m.role === 'editor' ? { background: 'rgba(37,99,235,0.12)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.3)' } :
                    m.role === 'viewer' ? { background: 'rgba(107,114,128,0.12)', color: '#4b5563', border: '1px solid rgba(107,114,128,0.3)' } :
                    { background: 'rgba(107,114,128,0.12)', color: '#4b5563', border: '1px solid rgba(107,114,128,0.3)' }
                  )
                }}>
                  {m.role === 'owner' ? '★ Propietario' :
                   m.role === 'editor' ? '✏ Editor' :
                   m.role === 'viewer' ? '👁 Visualizador' : '👤 Miembro'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selObs && <ObsModal obs={selObs} onClose={() => setSelObs(null)} />}
      {selRoute && (
        <RouteModal
          route={selRoute}
          obsInRoute={obs.filter(o => o.routeId === selRoute.id)}
          onClose={() => setSelRoute(null)}
          onObsClick={setSelObs}
          onRefresh={refreshRoutes}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: toast.type === 'success' ? 'var(--green)' : '#d32f2f',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 12,
          boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'slideIn 0.3s ease',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  )
}
