import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Observation, Route } from '../types'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface Props {
  observations: Observation[]
  routes: Route[]
  height?: number
  onObsClick?: (obs: Observation) => void
}

export default function ProjectMap({ observations, routes, height = 400, onObsClick }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const obsMapRef = useRef<Map<string, Observation>>(new Map())
  const onObsClickRef = useRef(onObsClick)
  onObsClickRef.current = onObsClick

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    const map = L.map(ref.current).setView([40, -3], 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map)
    mapRef.current = map

    // Listen for clicks on "Ver detalle" buttons inside Leaflet popups
    // Use document-level listener because Leaflet renders popups outside the map div
    document.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-obs-id]') as HTMLElement | null
      if (!btn) return
      const obsId = btn.getAttribute('data-obs-id')
      if (!obsId) return
      const obs = obsMapRef.current.get(obsId)
      if (obs) onObsClickRef.current?.(obs)
    })
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    map.eachLayer(l => { if (!(l instanceof L.TileLayer)) map.removeLayer(l) })
    obsMapRef.current.clear()

    const bounds: L.LatLng[] = []

    observations.forEach(obs => {
      obsMapRef.current.set(obs.id, obs)
      const ll = L.latLng(obs.latitude, obs.longitude)
      bounds.push(ll)
      const div = document.createElement('div')
      div.innerHTML = `
        <b style="font-size:13px">${obs.taxonName}</b>
        ${obs.title ? `<br><span style="font-size:12px">${obs.title}</span>` : ''}
        <br><small style="color:#666">${new Date(obs.observedAt).toLocaleDateString()}</small>
        <br><button data-obs-id="${obs.id}" style="margin-top:6px;background:#2e7d32;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit">Ver detalle →</button>
      `
      L.circleMarker(ll, { radius: 7, color: '#2e7d32', fillColor: '#4caf50', fillOpacity: 0.9, weight: 2 })
        .bindPopup(L.popup({ minWidth: 180 }).setContent(div))
        .addTo(map)
    })

    routes.forEach(route => {
      if (!route.trackPointsJson) return
      try {
        const pts: [number, number][] = JSON.parse(route.trackPointsJson)
        if (!pts.length) return
        const lls = pts.map(([lat, lng]) => L.latLng(lat, lng))
        lls.forEach(ll => bounds.push(ll))
        L.polyline(lls, { color: '#1565c0', weight: 3 })
          .bindPopup(`<b>${route.name}</b><br>${(route.distanceMeters / 1000).toFixed(2)} km`)
          .addTo(map)
      } catch { /* invalid json */ }
    })

    if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] })
  }, [observations, routes])

  return <div ref={ref} style={{ height, borderRadius: 8, overflow: 'hidden' }} />
}
