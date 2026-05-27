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
  editMode?: boolean
  onObservationMove?: (id: string, lat: number, lng: number) => void
  isRouteEditMode?: boolean
  onRoutePointsChange?: (points: { lat: number; lon: number }[]) => void
}

export default function ProjectMap({
  observations,
  routes,
  height = 400,
  onObsClick,
  editMode = false,
  onObservationMove,
  isRouteEditMode = false,
  onRoutePointsChange
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const obsMapRef = useRef<Map<string, Observation>>(new Map())
  const onObsClickRef = useRef(onObsClick)
  onObsClickRef.current = onObsClick
  const onObservationMoveRef = useRef(onObservationMove)
  onObservationMoveRef.current = onObservationMove
  const onRoutePointsChangeRef = useRef(onRoutePointsChange)
  onRoutePointsChangeRef.current = onRoutePointsChange
  const hasFittedRef = useRef(false)

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
        ${editMode ? `<br><small style="color:#2e7d32;font-weight:bold">Arrastra para mover</small>` : `<br><button data-obs-id="${obs.id}" style="margin-top:6px;background:var(--green);color:#fff;border:none;border-radius:var(--radius);padding:4px 10px;font-size:12px;cursor:pointer;font-family:inherit">Ver detalle</button>`}
      `

      if (editMode) {
        const marker = L.marker(ll, {
          draggable: true,
          icon: L.divIcon({
            className: 'custom-draggable-marker',
            html: `<div style="
              width: 20px;
              height: 20px;
              background: var(--green);
              border: 2.5px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: move;
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        })
          .bindPopup(L.popup({ minWidth: 180 }).setContent(div))
          .addTo(map)

        marker.on('dragend', (event) => {
          const newLatLng = (event.target as L.Marker).getLatLng()
          onObservationMoveRef.current?.(obs.id, newLatLng.lat, newLatLng.lng)
        })
      } else {
        L.circleMarker(ll, { radius: 7, color: '#2e7d32', fillColor: '#4caf50', fillOpacity: 0.9, weight: 2 })
          .bindPopup(L.popup({ minWidth: 180 }).setContent(div))
          .addTo(map)
      }
    })

    routes.forEach(route => {
      if (!route.trackPointsJson) return
      try {
        const rawPts = JSON.parse(route.trackPointsJson)
        if (!Array.isArray(rawPts) || !rawPts.length) return
        
        const lls = rawPts.map(pt => {
          if (Array.isArray(pt)) {
            return L.latLng(pt[0], pt[1])
          } else if (pt && typeof pt === 'object') {
            const lat = pt.lat !== undefined ? pt.lat : pt.latitude
            const lon = pt.lon !== undefined ? pt.lon : (pt.lng !== undefined ? pt.lng : pt.longitude)
            if (lat !== undefined && lon !== undefined) {
              return L.latLng(lat, lon)
            }
          }
          return null
        }).filter((ll): ll is L.LatLng => ll !== null)

        if (!lls.length) return
        lls.forEach(ll => bounds.push(ll))

        // Draw neon glow outer line
        const glowLine = L.polyline(lls, {
          color: '#6366f1', // Indigo glow
          weight: 8,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map)

        // Draw main route core line
        const mainLine = L.polyline(lls, {
          color: '#3b82f6', // Premium bright blue
          weight: 4,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round'
        })
          .bindPopup(`<b>Ruta: ${route.name}</b><br>Distancia: ${(route.distanceMeters / 1000).toFixed(2)} km`)
          .addTo(map)

        // Hover effects - changes core and glow colors dynamically
        mainLine.on('mouseover', () => {
          mainLine.setStyle({ color: '#f43f5e', weight: 5 }) // Rose core
          glowLine.setStyle({ color: '#ec4899', weight: 11, opacity: 0.6 }) // Pink glow
        })
        mainLine.on('mouseout', () => {
          mainLine.setStyle({ color: '#3b82f6', weight: 4 }) // Restores blue core
          glowLine.setStyle({ color: '#6366f1', weight: 8, opacity: 0.35 }) // Restores indigo glow
        })

        // Draw Start and End Markers (premium badges)
        if (lls.length > 0) {
          L.marker(lls[0], {
            icon: L.divIcon({
              className: 'route-start-marker',
              html: `<div style="
                background: #10b981;
                color: white;
                padding: 3px 7px;
                border-radius: 8px;
                font-size: 9px;
                font-weight: 800;
                border: 1.5px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                text-align: center;
                line-height: 1;
                font-family: system-ui, -apple-system, sans-serif;
                letter-spacing: 0.5px;
              ">INICIO</div>`,
              iconSize: [46, 18],
              iconAnchor: [23, 9]
            })
          })
            .bindPopup(`<b>Inicio de ruta: ${route.name}</b>`)
            .addTo(map)

          if (lls.length > 1) {
            L.marker(lls[lls.length - 1], {
              icon: L.divIcon({
                className: 'route-end-marker',
                html: `<div style="
                  background: #ef4444;
                  color: white;
                  padding: 3px 7px;
                  border-radius: 8px;
                  font-size: 9px;
                  font-weight: 800;
                  border: 1.5px solid white;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.35);
                  text-align: center;
                  line-height: 1;
                  font-family: system-ui, -apple-system, sans-serif;
                  letter-spacing: 0.5px;
                ">FIN</div>`,
                iconSize: [36, 18],
                iconAnchor: [18, 9]
              })
            })
              .bindPopup(`<b>Fin de ruta: ${route.name}</b>`)
              .addTo(map)
          }
        }

        // Draw draggable markers for each trackpoint in edit mode
        if (isRouteEditMode && onRoutePointsChangeRef.current) {
          lls.forEach((ll, idx) => {
            const ptMarker = L.marker(ll, {
              draggable: true,
              icon: L.divIcon({
                className: 'route-edit-point-marker',
                html: `<div style="
                  width: 14px;
                  height: 14px;
                  background: #3b82f6;
                  border: 2px solid white;
                  border-radius: 50%;
                  box-shadow: 0 1px 5px rgba(0,0,0,0.3);
                  cursor: move;
                "></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              })
            }).addTo(map)

            ptMarker.on('drag', (e) => {
              const newLatLng = (e.target as L.Marker).getLatLng()
              lls[idx] = newLatLng
              mainLine.setLatLngs(lls)
              glowLine.setLatLngs(lls)
            })

            ptMarker.on('dragend', () => {
              const updated = lls.map(l => ({ lat: l.lat, lon: l.lng }))
              onRoutePointsChangeRef.current?.(updated)
            })
          })
        }
      } catch { /* invalid json */ }
    })

    if (bounds.length && !hasFittedRef.current) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] })
      hasFittedRef.current = true
    }
  }, [observations, routes, editMode, isRouteEditMode])

  return <div ref={ref} style={{ height, borderRadius: 8, overflow: 'hidden' }} />
}
