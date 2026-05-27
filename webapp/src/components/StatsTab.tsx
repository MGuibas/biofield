import { useEffect, useRef, type ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ProjectStats } from '../types'
import { Search, Compass, FileText, Clock, Ruler, Dna } from 'lucide-react'

// ── Bar chart SVG ─────────────────────────────────────────────────────────────
function BarChart({ data, labelKey, valueKey, color = 'var(--green)' }: {
  data: Record<string, any>[]
  labelKey: string
  valueKey: string
  color?: string
}) {
  if (!data.length) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sin datos.</p>
  const max = Math.max(...data.map(d => d[valueKey]))
  const W = 600, barH = 20, gap = 8, labelW = 160, padding = 16
  const height = data.length * (barH + gap) + padding * 2

  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      {data.map((d, i) => {
        const y = padding + i * (barH + gap)
        const barW = max > 0 ? ((d[valueKey] / max) * (W - labelW - 60)) : 0
        return (
          <g key={i}>
            <text x={labelW - 10} y={y + barH / 2 + 4} textAnchor="end" fontSize={11} fill="var(--muted)"
              style={{ fontFamily: 'var(--font-family, inherit)', fontWeight: 500 }}>
              {String(d[labelKey]).length > 22 ? String(d[labelKey]).slice(0, 22) + '…' : d[labelKey]}
            </text>
            <rect 
              x={labelW} y={y} width={Math.max(barW, 2)} height={barH} rx={3} 
              fill={color} opacity={0.8}
              style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.fill = 'var(--green-dark)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.fill = color;
              }}
            />
            <text x={labelW + barW + 8} y={y + barH / 2 + 4} fontSize={11} fill="var(--text)"
              fontWeight="700" style={{ fontFamily: 'var(--font-family, inherit)' }}>
              {d[valueKey]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Line/bar chart for obs by day ─────────────────────────────────────────────
function DayChart({ data }: { data: { date: string; count: number }[] }) {
  if (!data.length) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sin datos.</p>
  const max = Math.max(...data.map(d => d.count))
  const W = 600, H = 140, padL = 30, padB = 36, padT = 10
  const innerW = W - padL - 10
  const innerH = H - padB - padT
  const step = innerW / Math.max(data.length - 1, 1)

  // Show at most 12 labels to avoid clutter
  const showLabel = (i: number) => data.length <= 12 || i % Math.ceil(data.length / 12) === 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = padT + innerH * (1 - t)
        return (
          <g key={t}>
            <line x1={padL} x2={W - 10} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} opacity={0.6} />
            <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={9} fill="var(--muted)" fontWeight="500">
              {Math.round(max * t)}
            </text>
          </g>
        )
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const x = padL + i * step
        const barH = max > 0 ? (d.count / max) * innerH : 0
        const barW = Math.max(step * 0.45, 3)
        return (
          <g key={i}>
            <rect
              x={x - barW / 2} y={padT + innerH - barH}
              width={barW} height={Math.max(barH, 1)}
              rx={2} fill="var(--green)" opacity={0.75}
              style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.fill = 'var(--green-dark)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '0.75';
                e.currentTarget.style.fill = 'var(--green)';
              }}
            />
            {showLabel(i) && (
              <text x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--muted)"
                style={{ fontFamily: 'var(--font-family, inherit)', fontWeight: 500 }}>
                {d.date.slice(5)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Heatmap using Leaflet ─────────────────────────────────────────────────────
function HeatmapMap({ points }: { points: [number, number][] }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    mapRef.current = L.map(ref.current).setView([40, -3], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapRef.current)
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !points.length) return
    map.eachLayer(l => { if (!(l instanceof L.TileLayer)) map.removeLayer(l) })
    const bounds: L.LatLng[] = []
    points.forEach(([lat, lng]) => {
      const ll = L.latLng(lat, lng)
      bounds.push(ll)
      L.circleMarker(ll, { radius: 6, color: '#e53935', fillColor: '#ef5350', fillOpacity: 0.5, weight: 1 }).addTo(map)
    })
    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] })
  }, [points])

  return <div ref={ref} style={{ height: 320, borderRadius: 'var(--radius)', overflow: 'hidden' }} />
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="card" style={{ 
      textAlign: 'center', 
      padding: '24px 16px', 
      flex: '1 1 140px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow)',
      border: '1px solid var(--border)'
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 'var(--radius)',
        background: 'var(--green-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--green)',
        marginBottom: 10
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontWeight: 600 }}>{label}</div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StatsTab({ stats }: { stats: ProjectStats }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon={<Search size={18} />} value={stats.totalObservations} label="Observaciones" />
        <StatCard icon={<Dna size={18} />} value={stats.uniqueSpecies}     label="Especies únicas" />
        <StatCard icon={<Compass size={18} />} value={stats.totalRoutes}       label="Rutas" />
        <StatCard icon={<Ruler size={18} />} value={`${stats.totalDistanceKm} km`} label="Distancia total" />
        <StatCard icon={<Clock size={18} />}  value={`${stats.totalFieldHours}h`}  label="Horas en campo" />
        <StatCard icon={<FileText size={18} />} value={stats.totalNotes}        label="Notas" />
      </div>

      {/* Especies más observadas */}
      <div className="card" style={{ borderRadius: 'var(--radius-lg)' }}>
        <p className="section-title" style={{ marginBottom: 14 }}>Top especies observadas</p>
        <BarChart data={stats.topSpecies} labelKey="taxonName" valueKey="count" color="var(--green)" />
      </div>

      {/* Observaciones por día */}
      <div className="card" style={{ borderRadius: 'var(--radius-lg)' }}>
        <p className="section-title" style={{ marginBottom: 14 }}>Observaciones por fecha</p>
        <DayChart data={stats.obsByDay} />
      </div>

      {/* Por miembro */}
      {stats.obsByMember.length > 1 && (
        <div className="card" style={{ borderRadius: 'var(--radius-lg)' }}>
          <p className="section-title" style={{ marginBottom: 14 }}>Observaciones por miembro</p>
          <BarChart data={stats.obsByMember} labelKey="displayName" valueKey="observationCount" color="#1565c0" />
        </div>
      )}

      {/* Mapa de calor */}
      {stats.heatmapPoints.length > 0 && (
        <div className="card" style={{ borderRadius: 'var(--radius-lg)' }}>
          <p className="section-title" style={{ marginBottom: 14 }}>Mapa de calor de observaciones</p>
          <HeatmapMap points={stats.heatmapPoints} />
        </div>
      )}
    </div>
  )
}
