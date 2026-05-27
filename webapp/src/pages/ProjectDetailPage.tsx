import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import api, { photoUrl, getAvatarUrl } from '../api'
import type { ProjectDetail, Observation, Route, Note, ActivityItem, Comment, ProjectStats } from '../types'
import ProjectMap from '../components/ProjectMap'
import Route3DModal from '../components/Route3DModal'
import Navbar from '../components/Navbar'
import Modal from '../components/Modal'
import StatsTab from '../components/StatsTab'
import { 
  Map as MapIcon, Search, Compass, FileText, BarChart3, Activity, Users, 
  Crown, Check, Edit2, Eye, Calendar, Clock, Ruler, X, Shield,
  MapPin, Mountain, Hash, CloudSun, Thermometer, Droplets, Tag
} from 'lucide-react'

const TABS = [
  { label: 'Mapa', icon: 'map' },
  { label: 'Observaciones', icon: 'search' },
  { label: 'Rutas', icon: 'compass' },
  { label: 'Notas', icon: 'file-text' },
  { label: 'Stats', icon: 'bar-chart' },
  { label: 'Actividad', icon: 'activity' },
  { label: 'Miembros', icon: 'users' },
]

function parseList(json?: string): string[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

function Avatar({ url, name, className = "avatar", style }: { url?: string | null; name: string; className?: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [url])

  return (
    <div className={className} style={style}>
      {url && !failed ? (
        <img 
          src={getAvatarUrl(url) ?? ''} 
          alt="" 
          referrerPolicy="no-referrer" 
          onError={() => setFailed(true)} 
        />
      ) : (
        name[0]?.toUpperCase() ?? '?'
      )}
    </div>
  )
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

function ObsModal({ obs, onClose, zIndex, onUpdate }: { obs: Observation; onClose: () => void; zIndex?: number; onUpdate?: (updatedObs: Observation) => void }) {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [failedPhotos, setFailedPhotos] = useState<Record<string, boolean>>({})
  const [comments, setComments] = useState<Comment[]>([])
  const [loadingComments, setLoadingComments] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form states:
  const [title, setTitle] = useState(obs.title ?? '')
  const [taxonName, setTaxonName] = useState(obs.taxonName)
  const [quantity, setQuantity] = useState(String(obs.quantity))
  const [description, setDescription] = useState(obs.description ?? '')
  const [notes, setNotes] = useState(obs.notes ?? '')
  const [weatherCondition, setWeatherCondition] = useState(obs.weatherCondition ?? '')
  const [temperature, setTemperature] = useState(obs.temperature != null ? String(obs.temperature) : '')
  const [humidity, setHumidity] = useState(obs.humidity != null ? String(obs.humidity) : '')
  const [habitatDescription, setHabitatDescription] = useState(obs.habitatDescription ?? '')
  const [latitude, setLatitude] = useState(String(obs.latitude))
  const [longitude, setLongitude] = useState(String(obs.longitude))
  const [altitude, setAltitude] = useState(obs.altitude != null ? String(obs.altitude) : '')
  const [tags, setTags] = useState(parseList(obs.tagsJson).join(', '))
  const [observedAt, setObservedAt] = useState('')

  const photos = parseList(obs.photosJson)
  const staticTags = parseList(obs.tagsJson)

  useEffect(() => {
    api.get(`/observations/${obs.id}/comments`)
      .then(r => setComments(r.data))
      .finally(() => setLoadingComments(false))
  }, [obs.id])

  useEffect(() => {
    setTitle(obs.title ?? '')
    setTaxonName(obs.taxonName)
    setQuantity(String(obs.quantity))
    setDescription(obs.description ?? '')
    setNotes(obs.notes ?? '')
    setWeatherCondition(obs.weatherCondition ?? '')
    setTemperature(obs.temperature != null ? String(obs.temperature) : '')
    setHumidity(obs.humidity != null ? String(obs.humidity) : '')
    setHabitatDescription(obs.habitatDescription ?? '')
    setLatitude(String(obs.latitude))
    setLongitude(String(obs.longitude))
    setAltitude(obs.altitude != null ? String(obs.altitude) : '')
    setTags(parseList(obs.tagsJson).join(', '))

    try {
      const d = new Date(obs.observedAt)
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      setObservedAt(localISOTime);
    } catch {
      setObservedAt('');
    }
  }, [obs])

  const handleSave = async () => {
    if (!taxonName.trim()) {
      alert("El nombre de la especie es obligatorio")
      return
    }
    if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
      alert("Coordenadas no válidas")
      return
    }

    try {
      setSaving(true)
      const parsedTags = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)

      const payload = {
        routeId: obs.routeId,
        taxonId: obs.taxonId,
        taxonName,
        title: title.trim() || null,
        description: description.trim() || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        altitude: altitude.trim() ? parseFloat(altitude) : null,
        observedAt: observedAt ? new Date(observedAt).toISOString() : obs.observedAt,
        notes: notes.trim() || null,
        quantity: parseInt(quantity) || 1,
        tagsJson: JSON.stringify(parsedTags),
        weatherCondition: weatherCondition.trim() || null,
        temperature: temperature.trim() ? parseFloat(temperature) : null,
        humidity: humidity.trim() ? parseFloat(humidity) : null,
        habitatDescription: habitatDescription.trim() || null,
        habitatPhotoUrl: obs.habitatPhotoUrl
      }

      const res = await api.put(`/observations/${obs.id}`, payload)
      onUpdate?.(res.data)
      setIsEditing(false)
    } catch (err) {
      console.error(err)
      alert("Error al guardar cambios de la observación")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal title={`Detalle de Observación`} onClose={onClose} zIndex={zIndex}>
        {/* Banner con gradiente e interruptor de edición */}
        <div style={{
          background: 'linear-gradient(135deg, var(--green-dark) 0%, var(--green) 100%)',
          padding: '18px 20px',
          color: '#fff',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ position: 'absolute', width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -40, right: -20 }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{obs.title ?? obs.taxonName}</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', margin: '4px 0 0 0' }}>{obs.taxonName}</p>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="btn-primary"
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: isEditing ? '#757575' : 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            {isEditing ? 'Cancelar' : '✏️ Editar'}
          </button>
        </div>

        {isEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>TÍTULO DE OBSERVACIÓN</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>ESPECIE (NOMBRE TAXONÓMICO) *</label>
                <input 
                  type="text" 
                  value={taxonName} 
                  onChange={e => setTaxonName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>DESCRIPCIÓN</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', minHeight: 60, fontFamily: 'inherit' }}
              />
            </div>

            <p className="section-title">Información de Campo</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>FECHA Y HORA *</label>
                <input 
                  type="datetime-local" 
                  value={observedAt} 
                  onChange={e => setObservedAt(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>CANTIDAD</label>
                <input 
                  type="number" 
                  value={quantity} 
                  onChange={e => setQuantity(e.target.value)}
                  min={1}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>LATITUD *</label>
                <input 
                  type="number" 
                  step="any"
                  value={latitude} 
                  onChange={e => setLatitude(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>LONGITUD *</label>
                <input 
                  type="number" 
                  step="any"
                  value={longitude} 
                  onChange={e => setLongitude(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>ALTITUD (METROS)</label>
                <input 
                  type="number" 
                  value={altitude} 
                  onChange={e => setAltitude(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <p className="section-title">Meteorología y Clima</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>CONDICIÓN CLIMÁTICA</label>
                <input 
                  type="text" 
                  value={weatherCondition} 
                  placeholder="Soleado, lluvioso, etc..."
                  onChange={e => setWeatherCondition(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>TEMPERATURA (°C)</label>
                <input 
                  type="number" 
                  step="any"
                  value={temperature} 
                  onChange={e => setTemperature(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>HUMEDAD (%)</label>
                <input 
                  type="number" 
                  value={humidity} 
                  onChange={e => setHumidity(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <p className="section-title">Hábitat y Notas</p>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>DESCRIPCIÓN DEL HÁBITAT</label>
              <textarea 
                value={habitatDescription} 
                onChange={e => setHabitatDescription(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', minHeight: 50, fontFamily: 'inherit' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>NOTAS ADICIONALES DEL OBSERVADOR</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', minHeight: 60, fontFamily: 'inherit' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 4 }}>ETIQUETAS (SEPARADAS POR COMAS)</label>
              <input 
                type="text" 
                value={tags} 
                placeholder="ave, migratorio, bosque"
                onChange={e => setTags(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="btn-primary" 
                style={{ flex: 1, padding: '10px 16px', fontWeight: 600, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}
              >
                {saving ? 'Guardando...' : '💾 Guardar Cambios'}
              </button>
              <button 
                onClick={() => setIsEditing(false)} 
                className="btn-outline" 
                style={{ flex: 1, padding: '10px 16px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            {photos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p className="section-title">Fotos ({photos.length})</p>
                <div className="photo-grid">
                  {photos.map((p, i) => {
                    const url = photoUrl(p) ?? '';
                    return (
                      <div 
                        key={i} 
                        className="photo-thumb" 
                        style={{ borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }} 
                        onClick={() => { if (!failedPhotos[url]) setLightbox(url); }}
                      >
                        <img 
                          src={url} 
                          alt="" 
                          onError={(e) => {
                            setFailedPhotos(prev => ({ ...prev, [url]: true }));
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                            e.currentTarget.style.objectFit = 'contain';
                            e.currentTarget.style.padding = '24px';
                            e.currentTarget.style.background = 'var(--bg)';
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {obs.description && (
              <div style={{ marginBottom: 20 }}>
                <p className="section-title">Descripción</p>
                <p style={{ fontSize: 14, color: 'var(--text)', background: 'var(--bg)', padding: '12px 16px', borderRadius: 'var(--radius)', lineHeight: 1.6, borderLeft: '3px solid var(--green)' }}>
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
              <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>FECHA Y HORA</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} style={{ color: 'var(--muted)' }} /> {new Date(obs.observedAt).toLocaleString()}
                </span>
              </div>
              <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>UBICACIÓN (LAT, LNG)</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} style={{ color: 'var(--muted)' }} /> {obs.latitude.toFixed(5)}, {obs.longitude.toFixed(5)}
                </span>
              </div>
              {obs.altitude != null && (
                <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>ALTITUD</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mountain size={14} style={{ color: 'var(--muted)' }} /> {obs.altitude.toFixed(0)} m
                  </span>
                </div>
              )}
              <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>CANTIDAD INDIVIDUOS</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Hash size={14} style={{ color: 'var(--muted)' }} /> × {obs.quantity}
                </span>
              </div>
              {obs.weatherCondition && (
                <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>CLIMA</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CloudSun size={14} style={{ color: 'var(--muted)' }} /> {obs.weatherCondition}
                  </span>
                </div>
              )}
              {(obs.temperature != null || obs.humidity != null) && (
                <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block', fontWeight: 600 }}>METEOROLOGÍA</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {obs.temperature != null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Thermometer size={14} style={{ color: 'var(--muted)' }} /> {obs.temperature}°C
                      </span>
                    )}
                    {obs.humidity != null && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Droplets size={14} style={{ color: 'var(--muted)' }} /> {obs.humidity}%
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {obs.notes && (
              <div style={{ marginBottom: 20 }}>
                <p className="section-title">Notas de Observador</p>
                <p style={{ fontSize: 14, background: 'var(--bg)', color: 'var(--text)', padding: '12px 16px', borderRadius: 'var(--radius)', whiteSpace: 'pre-wrap', lineHeight: 1.6, borderLeft: '3px solid var(--green)', boxShadow: 'var(--shadow)' }}>
                  {obs.notes}
                </p>
              </div>
            )}

            {(obs.habitatDescription || obs.habitatPhotoUrl) && (
              <div style={{ marginBottom: 20 }}>
                <p className="section-title">Hábitat</p>
                <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: 14, borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {obs.habitatDescription && (
                    <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>{obs.habitatDescription}</p>
                  )}
                  {obs.habitatPhotoUrl && (() => {
                    const url = photoUrl(obs.habitatPhotoUrl) ?? '';
                    return (
                      <div 
                        className="photo-thumb" 
                        style={{ width: 140, height: 140, borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow)' }} 
                        onClick={() => { if (!failedPhotos[url]) setLightbox(url); }}
                      >
                        <img 
                          src={url} 
                          alt="hábitat" 
                          onError={(e) => {
                            setFailedPhotos(prev => ({ ...prev, [url]: true }));
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                            e.currentTarget.style.objectFit = 'contain';
                            e.currentTarget.style.padding = '24px';
                            e.currentTarget.style.background = 'var(--bg)';
                          }}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {staticTags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                {staticTags.map(t => (
                  <span key={t} className="badge badge-blue" style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Tag size={12} /> {t}
                  </span>
                ))}
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
                    <Avatar 
                      url={c.avatarUrl} 
                      name={c.displayName} 
                      style={{ flexShrink: 0, border: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--green-light) 0%, rgba(46, 125, 50, 0.05) 100%)' }} 
                    />
                    <div className="card" style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 2px 6px rgba(0,0,0,0.01)' }}>
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
          </>
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
                      <img 
                        src={photoUrl(photos[0]) ?? ''} 
                        alt="" 
                        style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} 
                        onError={(e) => {
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                          e.currentTarget.style.objectFit = 'contain';
                          e.currentTarget.style.padding = '8px';
                          e.currentTarget.style.background = 'var(--bg)';
                        }}
                      />
                    ) : (
                      <div style={{ width: 50, height: 50, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', flexShrink: 0 }}>
                        <Search size={20} />
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
      {selObs && (
        <ObsModal 
          obs={selObs} 
          onClose={() => setSelObs(null)} 
          zIndex={20000} 
          onUpdate={(updated) => {
            setSelObs(updated);
            onRefresh?.();
          }} 
        />
      )}
    </>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const location = useLocation()
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
    let altitude: number | null = null
    try {
      const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lng}`)
      if (res.ok) {
        const data = await res.json()
        if (data.results && data.results[0]) {
          altitude = data.results[0].elevation
        }
      }
    } catch (err) {
      console.warn('Fallo al obtener la altitud de Open-Elevation:', err)
    }

    try {
      await api.patch(`/observations/${obsId}/coordinates`, {
        latitude: lat,
        longitude: lng,
        altitude: altitude ?? undefined
      })
      setObs(prevObs => prevObs.map(o => o.id === obsId ? { ...o, latitude: lat, longitude: lng, altitude: altitude ?? o.altitude } : o))
      setToast({ type: 'success', message: altitude !== null ? `Ubicación actualizada. Altitud detectada: ${altitude.toFixed(0)}m` : 'Ubicación actualizada correctamente.' })
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

  useEffect(() => {
    if (!loading && obs.length > 0 && location.state?.selectedObsId) {
      const matched = obs.find(o => o.id === location.state.selectedObsId)
      if (matched) {
        setSelObs(matched)
        nav(location.pathname, { replace: true, state: {} })
      }
    }
  }, [loading, obs, location.state, nav, location.pathname])

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
            { label: 'Observaciones', value: obs.length, icon: <Search size={18} />, bg: 'var(--green-light)', color: 'var(--green)' },
            { label: 'Rutas', value: routes.length, icon: <Compass size={18} />, bg: '#e3f2fd', color: '#1565c0' },
            { label: 'Notas', value: notes.length, icon: <FileText size={18} />, bg: '#ffe0b2', color: '#e65100' },
            { label: 'Miembros', value: detail.members.length, icon: <Users size={18} />, bg: '#ede7f6', color: '#4a148c' },
          ].map(s => (
            <div key={s.label} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)' }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius)',
                background: s.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: s.color,
                flexShrink: 0
              }}>{s.icon}</div>
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: 'var(--text)' }}>{s.value}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginTop: 1 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs Bar */}
        <div className="tabs" style={{ display: 'flex', gap: 4 }}>
          {TABS.map((t, i) => (
            <button 
              key={t.label} 
              className={`tab${tab === i ? ' active' : ''}`} 
              onClick={() => setTab(i)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '10px 16px', borderBottom: '2px solid transparent' }}
            >
              {t.icon === 'map' && <MapIcon size={14} />}
              {t.icon === 'search' && <Search size={14} />}
              {t.icon === 'compass' && <Compass size={14} />}
              {t.icon === 'file-text' && <FileText size={14} />}
              {t.icon === 'bar-chart' && <BarChart3 size={14} />}
              {t.icon === 'activity' && <Activity size={14} />}
              {t.icon === 'users' && <Users size={14} />}
              {t.label}
            </button>
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
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow)',
              flexWrap: 'wrap',
              gap: 12
            }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapIcon size={15} /> Mapa del Proyecto
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
                  borderRadius: 'var(--radius)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  border: editMode ? '1px solid var(--green-dark)' : '1px solid var(--border)',
                  boxShadow: editMode ? 'var(--shadow)' : 'none'
                }}
              >
                {editMode ? (
                  <>
                    <Shield size={14} /> Finalizar Edición
                  </>
                ) : (
                  <>
                    <Edit2 size={14} /> Editar Ubicaciones
                  </>
                )}
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
                  style={{ display: 'flex', flexDirection: 'column', padding: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
                  onClick={() => setSelObs(o)}
                >
                  {/* Photo container */}
                  {photos[0] ? (
                    <div style={{ width: '100%', height: 160, borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                      <img 
                        src={photoUrl(photos[0]) ?? ''} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => {
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                          e.currentTarget.style.objectFit = 'contain';
                          e.currentTarget.style.padding = '36px';
                          e.currentTarget.style.background = 'var(--bg)';
                        }}
                      />
                      {photos.length > 1 && (
                        <span className="badge" style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, backdropFilter: 'blur(4px)', fontWeight: 700, borderRadius: 'var(--radius)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          +{photos.length - 1} fotos
                        </span>
                      )}
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: 160, borderRadius: 'var(--radius)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: 'var(--muted)' }}>
                      <Search size={32} />
                    </div>
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text)', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {o.title ?? o.taxonName}
                      </h4>
                      <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', margin: '2px 0 10px 0' }}>{o.taxonName}</p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', borderTop: '1px solid var(--border)', paddingTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {new Date(o.observedAt).toLocaleDateString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Cant: {o.quantity}</span>
                      {o.temperature != null && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>Temp: {o.temperature}°C</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {obs.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 40px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Search size={32} color="var(--muted)" style={{ marginBottom: 8 }} />
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
                  style={{ display: 'flex', flexDirection: 'column', padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}
                  onClick={() => setSelRoute(r)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{r.name}</h4>
                      <div style={{ display: 'flex', gap: 14, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {new Date(r.startedAt).toLocaleString()}</span>
                        {dur && (
                          <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={13} /> {dur}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 8 }}>
                      {obsCount > 0 && (
                        <span className="badge badge-green" style={{ fontWeight: 600, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Search size={11} /> {obsCount} obs.
                        </span>
                      )}
                      <span className="badge badge-blue" style={{ fontWeight: 600, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Ruler size={11} /> {(r.distanceMeters / 1000).toFixed(2)} km
                      </span>
                    </div>
                  </div>
                  {r.notes && (
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, background: 'var(--bg)', padding: '8px 12px', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--green)' }}>
                      {r.notes}
                    </p>
                  )}
                </div>
              )
            })}
            {routes.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Compass size={32} color="var(--muted)" style={{ marginBottom: 8 }} />
                <p>Sin rutas grabadas en este proyecto.</p>
              </div>
            )}
          </div>
        )}

        {tab === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map(n => (
              <div key={n.id} className="card" style={{ padding: 18, border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text)' }}>{n.title}</h4>
                  <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={13} /> {new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: 14, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text)' }}>{n.body}</p>
                {n.latitude != null && n.longitude != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: 'var(--muted)', background: 'var(--bg)', padding: '4px 10px', borderRadius: 'var(--radius)', alignSelf: 'flex-start' }}>
                    <span>Coordenadas: {n.latitude.toFixed(5)}, {n.longitude.toFixed(5)}</span>
                  </div>
                )}
              </div>
            ))}
            {notes.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <FileText size={32} color="var(--muted)" style={{ marginBottom: 8 }} />
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
                <Avatar 
                  url={a.avatarUrl} 
                  name={a.actorName} 
                  className="avatar avatar-lg"
                  style={{ border: '1px solid var(--border)', background: 'linear-gradient(135deg, var(--green-light) 0%, rgba(46, 125, 50, 0.05) 100%)' }} 
                />
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
                <Avatar 
                  url={m.avatarUrl} 
                  name={m.displayName} 
                  className="avatar avatar-lg"
                  style={{ border: '2px solid var(--green-light)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', background: 'linear-gradient(135deg, var(--green-light) 0%, rgba(46, 125, 50, 0.05) 100%)' }} 
                />
                
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
                  padding: '3px 8px',
                  borderRadius: 'var(--radius)',
                  textTransform: 'capitalize',
                  ...(
                    m.role === 'owner' ? { background: 'rgba(245,158,11,0.15)', color: '#b45309', border: '1px solid rgba(245,158,11,0.35)' } :
                    m.role === 'editor' ? { background: 'rgba(37,99,235,0.12)', color: '#1d4ed8', border: '1px solid rgba(37,99,235,0.3)' } :
                    m.role === 'viewer' ? { background: 'rgba(107,114,128,0.12)', color: '#4b5563', border: '1px solid rgba(107,114,128,0.3)' } :
                    { background: 'rgba(107,114,128,0.12)', color: '#4b5563', border: '1px solid rgba(107,114,128,0.3)' }
                  )
                }}>
                  {m.role === 'owner' ? (
                    <>
                      <Crown size={11} /> Propietario
                    </>
                  ) : m.role === 'editor' ? (
                    <>
                      <Edit2 size={11} /> Editor
                    </>
                  ) : m.role === 'viewer' ? (
                    <>
                      <Eye size={11} /> Visualizador
                    </>
                  ) : (
                    <>
                      <Users size={11} /> Miembro
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selObs && (
        <ObsModal 
          obs={selObs} 
          onClose={() => setSelObs(null)} 
          zIndex={20000} 
          onUpdate={(updated) => {
            setObs(prev => prev.map(o => o.id === updated.id ? updated : o));
            setSelObs(updated);
          }} 
        />
      )}
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
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'slideIn 0.3s ease',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span>{toast.type === 'success' ? <Check size={16} /> : <X size={16} />}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  )
}
