import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ProjectStats } from '../types'

// ── Bar chart SVG ─────────────────────────────────────────────────────────────
function BarChart({ data, labelKey, valueKey, color = '#4caf50' }: {
  data: Record<string, any>[]
  labelKey: string
  valueKey: string
  color?: string
}) {
  if (!data.length) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Sin datos.</p>
  const max = Math.max(...data.map(d => d[valueKey]))
  const W = 600, barH = 28, gap = 6, labelW = 160, padding = 16
  const height = data.length * (barH + gap) + padding * 2

  return (
    <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      {data.map((d, i) => {
        const y = padding + i * (barH + gap)
        const barW = max > 0 ? ((d[valueKey] / max) * (W - labelW - 60)) : 0
        return (
          <g key={i}>
            <text x={labelW - 6} y={y + barH / 2 + 5} textAnchor="end" fontSize={12} fill="var(--muted)"
              style={{ fontFamily: 'system-ui' }}>
              {String(d[labelKey]).length > 22 ? String(d[labelKey]).slice(0, 22) + '…' : d[labelKey]}
            </text>
            <rect x={labelW} y={y} width={Math.max(barW, 2)} height={barH} rx={4} fill={color} opacity={0.85} />
            <text x={labelW + barW + 6} y={y + barH / 2 + 5} fontSize={12} fill="var(--text)"
              fontWeight="600" style={{ fontFamily: 'system-ui' }}>
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

  // Show at most 30 labels to avoid clutter
  const showLabel = (i: number) => data.length <= 12 || i % Math.ceil(data.length / 12) === 0

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block' }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = padT + innerH * (1 - t)
        return (
          <g key={t}>
            <line x1={padL} x2={W - 10} y1={y} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={10} fill="var(--muted)">
              {Math.round(max * t)}
            </text>
          </g>
        )
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const x = padL + i * step
        const barH = max > 0 ? (d.count / max) * innerH : 0
        const barW = Math.max(step * 0.6, 4)
        return (
          <g key={i}>
            <rect
              x={x - barW / 2} y={padT + innerH - barH}
              width={barW} height={Math.max(barH, 1)}
              rx={2} fill="#4caf50" opacity={0.8}
            />
            {showLabel(i) && (
              <text x={x} y={H - 4} textAnchor="middle" fontSize={9} fill="var(--muted)"
                style={{ fontFamily: 'system-ui' }}>
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

  return <div ref={ref} style={{ height: 320, borderRadius: 8, overflow: 'hidden' }} />
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 16px', flex: '1 1 140px' }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StatsTab({ stats }: { stats: ProjectStats }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard icon="🔬" value={stats.totalObservations} label="Observaciones" />
        <StatCard icon="🧬" value={stats.uniqueSpecies}     label="Especies únicas" />
        <StatCard icon="📍" value={stats.totalRoutes}       label="Rutas" />
        <StatCard icon="📏" value={`${stats.totalDistanceKm} km`} label="Distancia total" />
        <StatCard icon="⏱"  value={`${stats.totalFieldHours}h`}  label="Horas en campo" />
        <StatCard icon="📝" value={stats.totalNotes}        label="Notas" />
      </div>

      {/* Especies más observadas */}
      <div className="card">
        <p className="section-title" style={{ marginBottom: 14 }}>Top especies observadas</p>
        <BarChart data={stats.topSpecies} labelKey="taxonName" valueKey="count" color="#4caf50" />
      </div>

      {/* Observaciones por día */}
      <div className="card">
        <p className="section-title" style={{ marginBottom: 14 }}>Observaciones por fecha</p>
        <DayChart data={stats.obsByDay} />
      </div>

      {/* Por miembro */}
      {stats.obsByMember.length > 1 && (
        <div className="card">
          <p className="section-title" style={{ marginBottom: 14 }}>Observaciones por miembro</p>
          <BarChart data={stats.obsByMember} labelKey="displayName" valueKey="observationCount" color="#1565c0" />
        </div>
      )}

      {/* Mapa de calor */}
      {stats.heatmapPoints.length > 0 && (
        <div className="card">
          <p className="section-title" style={{ marginBottom: 14 }}>Mapa de calor de observaciones</p>
          <HeatmapMap points={stats.heatmapPoints} />
        </div>
      )}
    </div>
  )
}
