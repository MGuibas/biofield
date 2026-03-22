import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api, { API_BASE, photoUrl } from '../api'
import type { ProjectDetail, Observation, Route, Note, ActivityItem, Comment, ProjectStats } from '../types'
import ProjectMap from '../components/ProjectMap'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import StatsTab from '../components/StatsTab'

const TABS = ['🗺 Mapa', '🔬 Observaciones', '📍 Rutas', '📝 Notas', '📊 Stats', '⚡ Actividad', '👥 Miembros']

async function downloadExport(projectId: string, format: string) {
  const mimes: Record<string, string> = {
    csv: 'text/csv', geojson: 'application/geo+json',
    gpx: 'application/gpx+xml', pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  }
  const exts: Record<string, string> = { csv: 'csv', geojson: 'geojson', gpx: 'gpx', pdf: 'pdf', excel: 'xlsx' }
  const res = await api.get(`/projects/${projectId}/export`, {
    params: { format }, responseType: 'blob'
  })
  const url = URL.createObjectURL(new Blob([res.data], { type: mimes[format] }))
  const a = document.createElement('a')
  a.href = url; a.download = `biofield_${format}.${exts[format]}`
  a.click(); URL.revokeObjectURL(url)
}

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

function ObsModal({ obs, baseUrl, onClose }: { obs: Observation; baseUrl: string; onClose: () => void }) {
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
      <Modal title={obs.title ?? obs.taxonName} onClose={onClose}>
        <p style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 12 }}>{obs.taxonName}</p>

        {photos.length > 0 && (
          <>
            <p className="section-title">Fotos ({photos.length})</p>
            <div className="photo-grid" style={{ marginBottom: 16 }}>
              {photos.map((p, i) => (
                <div key={i} className="photo-thumb" onClick={() => setLightbox(photoUrl(p) ?? '')}>
                  <img src={photoUrl(p) ?? ''} alt="" />
                </div>
              ))}
            </div>
          </>
        )}

        {obs.description && (
          <>
            <p className="section-title">Descripción</p>
            <p style={{ fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>{obs.description}</p>
          </>
        )}

        <p className="section-title">Datos</p>
        <div className="stat-row" style={{ marginBottom: 16 }}>
          <span className="stat">📅 {new Date(obs.observedAt).toLocaleString()}</span>
          <span className="stat">📍 {obs.latitude.toFixed(5)}, {obs.longitude.toFixed(5)}</span>
          {obs.altitude != null && <span className="stat">⛰ {obs.altitude.toFixed(0)} m</span>}
          <span className="stat">× {obs.quantity}</span>
          {obs.weatherCondition && <span className="stat">🌤 {obs.weatherCondition}</span>}
          {obs.temperature != null && <span className="stat">🌡 {obs.temperature}°C</span>}
          {obs.humidity != null && <span className="stat">💧 {obs.humidity}%</span>}
        </div>

        {obs.notes && (
          <>
            <p className="section-title">Notas</p>
            <p style={{ fontSize: 14, marginBottom: 16, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{obs.notes}</p>
          </>
        )}

        {obs.habitatDescription && (
          <>
            <p className="section-title">Hábitat</p>
            <p style={{ fontSize: 14, marginBottom: obs.habitatPhotoUrl ? 8 : 16, lineHeight: 1.6 }}>{obs.habitatDescription}</p>
          </>
        )}
        {obs.habitatPhotoUrl && (
          <div className="photo-thumb" style={{ width: 200, marginBottom: 16 }} onClick={() => setLightbox(photoUrl(obs.habitatPhotoUrl) ?? '')}>
            <img src={photoUrl(obs.habitatPhotoUrl) ?? ''} alt="hábitat" />
          </div>
        )}

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {tags.map(t => <span key={t} className="badge badge-blue">{t}</span>)}
          </div>
        )}

        <hr className="divider" />
        <p className="section-title">Comentarios</p>
        {loadingComments
          ? <div className="spinner" style={{ width: 20, height: 20, margin: '12px auto', borderWidth: 2 }} />
          : comments.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--muted)' }}>Sin comentarios.</p>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                    <div className="avatar" style={{ flexShrink: 0 }}>
                      {c.avatarUrl ? <img src={`${baseUrl}${c.avatarUrl}`} alt="" /> : c.displayName[0]?.toUpperCase()}
                    </div>
                    <div className="card" style={{ flex: 1, padding: '8px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <b style={{ fontSize: 13 }}>{c.displayName}</b>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{relTime(c.createdAt)}</span>
                      </div>
                      <p style={{ fontSize: 13, lineHeight: 1.5 }}>{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
        }
      </Modal>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  )
}

function RouteModal({ route, obsInRoute, baseUrl, onClose }: { route: Route; obsInRoute: Observation[]; baseUrl: string; onClose: () => void }) {
  const [selObs, setSelObs] = useState<Observation | null>(null)
  const dur = duration(route.startedAt, route.endedAt)

  return (
    <>
      <Modal title={route.name} onClose={onClose} maxWidth={860}>
        <div className="stat-row" style={{ marginBottom: 16 }}>
          <span className="stat">📅 {new Date(route.startedAt).toLocaleString()}</span>
          {route.endedAt && <span className="stat">🏁 {new Date(route.endedAt).toLocaleString()}</span>}
          {dur && <span className="stat">⏱ {dur}</span>}
          <span className="badge badge-green" style={{ marginLeft: 4 }}>{(route.distanceMeters / 1000).toFixed(2)} km</span>
        </div>
        {route.notes && <p style={{ fontSize: 14, marginBottom: 16, color: 'var(--muted)' }}>{route.notes}</p>}
        <p className="section-title">Recorrido</p>
        <div style={{ marginBottom: 16 }}>
          <ProjectMap observations={obsInRoute} routes={[route]} height={320} />
        </div>
        {obsInRoute.length > 0 && (
          <>
            <p className="section-title">Observaciones en esta ruta ({obsInRoute.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {obsInRoute.map(o => {
                const photos = parseList(o.photosJson)
                return (
                  <div key={o.id} className="card card-hover" style={{ display: 'flex', gap: 10, padding: 12 }} onClick={() => setSelObs(o)}>
                    {photos[0] && <img src={photoUrl(photos[0]) ?? ''} alt="" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
                    <div>
                      <b style={{ fontSize: 13 }}>{o.title ?? o.taxonName}</b>
                      <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>{o.taxonName}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Modal>
      {selObs && <ObsModal obs={selObs} baseUrl={baseUrl} onClose={() => setSelObs(null)} />}
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
  const baseUrl = API_BASE.replace('/api', '')
  // baseUrl ya no se usa para fotos — se usa photoUrl(key)

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
    // Stats por separado para no bloquear la carga principal
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button className="btn-ghost" onClick={() => nav('/projects')} style={{ fontSize: 18, padding: '4px 8px' }}>←</button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>{detail.name}</h1>
            {detail.description && <p style={{ fontSize: 13, color: 'var(--muted)' }}>{detail.description}</p>}
          </div>
          {detail.isArchived && <span className="badge badge-grey">Archivado</span>}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Código:</span>
            <span style={{ fontFamily: 'monospace', background: 'var(--bg)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 6, fontSize: 13, fontWeight: 600 }}>{detail.shareCode}</span>
            {(['csv','geojson','gpx','pdf','excel'] as const).map(fmt => (
              <button key={fmt} className="btn-outline" style={{ padding: '5px 10px', fontSize: 12 }}
                onClick={() => downloadExport(id!, fmt)}>
                ⬇ {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Observaciones', value: obs.length, icon: '🔬' },
            { label: 'Rutas', value: routes.length, icon: '📍' },
            { label: 'Notas', value: notes.length, icon: '📝' },
            { label: 'Miembros', value: detail.members.length, icon: '👥' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="tabs">
          {TABS.map((t, i) => (
            <button key={t} className={`tab${tab === i ? ' active' : ''}`} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        {tab === 0 && <ProjectMap observations={obs} routes={routes} height={520} onObsClick={setSelObs} />}

        {tab === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {obs.map(o => {
              const photos = parseList(o.photosJson)
              return (
                <div key={o.id} className="card card-hover" onClick={() => setSelObs(o)}>
                  {photos[0] && <img src={photoUrl(photos[0]) ?? ''} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <b style={{ fontSize: 14 }}>{o.title ?? o.taxonName}</b>
                    {photos.length > 1 && <span className="badge badge-grey">+{photos.length - 1} fotos</span>}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>{o.taxonName}</p>
                  <div className="stat-row" style={{ marginTop: 8 }}>
                    <span className="stat" style={{ fontSize: 12 }}>📅 {new Date(o.observedAt).toLocaleDateString()}</span>
                    <span className="stat" style={{ fontSize: 12 }}>× {o.quantity}</span>
                    {o.temperature != null && <span className="stat" style={{ fontSize: 12 }}>🌡 {o.temperature}°C</span>}
                  </div>
                </div>
              )
            })}
            {obs.length === 0 && <p style={{ color: 'var(--muted)', gridColumn: '1/-1' }}>Sin observaciones.</p>}
          </div>
        )}

        {tab === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {routes.map(r => {
              const dur = duration(r.startedAt, r.endedAt)
              const obsCount = obs.filter(o => o.routeId === r.id).length
              return (
                <div key={r.id} className="card card-hover" onClick={() => setSelRoute(r)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <b style={{ fontSize: 15 }}>{r.name}</b>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {obsCount > 0 && <span className="badge badge-green">{obsCount} obs.</span>}
                      <span className="badge badge-blue">{(r.distanceMeters / 1000).toFixed(2)} km</span>
                    </div>
                  </div>
                  <div className="stat-row" style={{ marginTop: 8 }}>
                    <span className="stat">📅 {new Date(r.startedAt).toLocaleString()}</span>
                    {dur && <span className="stat">⏱ {dur}</span>}
                  </div>
                  {r.notes && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{r.notes}</p>}
                </div>
              )
            })}
            {routes.length === 0 && <p style={{ color: 'var(--muted)' }}>Sin rutas.</p>}
          </div>
        )}

        {tab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notes.map(n => (
              <div key={n.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <b style={{ fontSize: 15 }}>{n.title}</b>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{n.body}</p>
                {n.latitude != null && <p className="stat" style={{ marginTop: 10 }}>📍 {n.latitude.toFixed(5)}, {n.longitude?.toFixed(5)}</p>}
              </div>
            ))}
            {notes.length === 0 && <p style={{ color: 'var(--muted)' }}>Sin notas.</p>}
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
                <div className="avatar avatar-lg">
                  {a.avatarUrl ? <img src={`${baseUrl}${a.avatarUrl}`} alt="" /> : a.actorName[0]?.toUpperCase()}
                </div>
                <div className="card" style={{ flex: 1, padding: '10px 14px' }}>
                  <p style={{ fontSize: 14 }}><b>{a.actorName}</b> {a.description}</p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{relTime(a.occurredAt)}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && <p style={{ color: 'var(--muted)' }}>Sin actividad reciente.</p>}
          </div>
        )}

        {tab === 6 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {detail.members.map(m => (
              <div key={m.userId} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar avatar-lg">
                  {m.avatarUrl ? <img src={`${baseUrl}${m.avatarUrl}`} alt="" /> : m.displayName[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.displayName}</b>
                  <p style={{ fontSize: 12, color: 'var(--muted)' }}>Desde {new Date(m.joinedAt).toLocaleDateString()}</p>
                </div>
                <span className={`badge ${m.role === 'owner' ? 'badge-green' : 'badge-grey'}`}>{m.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selObs && <ObsModal obs={selObs} baseUrl={baseUrl} onClose={() => setSelObs(null)} />}
      {selRoute && (
        <RouteModal
          route={selRoute}
          obsInRoute={obs.filter(o => o.routeId === selRoute.id)}
          baseUrl={baseUrl}
          onClose={() => setSelRoute(null)}
        />
      )}
    </>
  )
}
