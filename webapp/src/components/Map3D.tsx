import { useRef, useEffect, useState } from 'react';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { interpolateRoute, getBearing, calculateRoute } from '../utils/routeHelpers';
import type { Coordinates } from '../utils/routeHelpers';
import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import type { Observation } from '../types';
import { photoUrl } from '../api';

interface Map3DProps {
  waypoints: Coordinates[];
  observations: Observation[];
  isPlaying: boolean;
  targetDuration: number;
  progress: number;
  zoomLevel: number;
  lookAheadPitch: number;
  autoCamera: boolean;
  onProgress: (progress: number, stats: { distance: string; speed: string; altitude: string }) => void;
  onFinish: () => void;
  onObsClick?: (obs: Observation) => void;
}

const mapStyle = {
  version: 8,
  sources: {
    esri: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: '&copy; Esri &mdash; Source: Esri, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  },
  layers: [
    {
      id: 'esri-tiles',
      type: 'raster',
      source: 'esri',
      minzoom: 0,
      maxzoom: 19
    }
  ]
} as any;

export default function Map3D({ 
  waypoints, observations, isPlaying, targetDuration, progress, zoomLevel, lookAheadPitch, autoCamera, onProgress, onFinish, onObsClick
}: Map3DProps) {
  const mapRef = useRef<MapRef>(null);
  const [routeLine, setRouteLine] = useState<Feature<LineString> | null>(null);
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null);

  const routeDistanceRef = useRef<number>(0);
  const routeDistanceCovered = useRef<number>(0);
  const pathPointsRef = useRef<Coordinates[]>([]);
  const segmentsRef = useRef<{dist: number, cumDist: number}[]>([]);
  const stepKm = 0.005; // 5 meters

  // Generate route and snap map initially
  useEffect(() => {
    const rt = calculateRoute(waypoints);
    setRouteLine(rt);
    if (!rt) {
        pathPointsRef.current = [];
        routeDistanceRef.current = 0;
        routeDistanceCovered.current = 0;
        segmentsRef.current = [];
        return;
    }

    pathPointsRef.current = interpolateRoute(rt, stepKm); 
    routeDistanceRef.current = turf.length(rt, { units: 'kilometers' });
    routeDistanceCovered.current = 0;

    let cum = 0;
    const segs = [];
    for(let i=0; i<waypoints.length-1; i++){
      const d = turf.distance(waypoints[i], waypoints[i+1]);
      cum += d;
      segs.push({dist: d, cumDist: cum});
    }
    segmentsRef.current = segs;
  }, [waypoints]);

  function getAutoCameraParams(dist: number) {
    if (dist > 100) return { zoom: 7.5, pitch: 20 };
    if (dist > 30) return { zoom: 9.5, pitch: 35 };
    if (dist > 10) return { zoom: 11.5, pitch: 45 };
    if (dist > 3) return { zoom: 13, pitch: 55 };
    if (dist > 1) return { zoom: 14.5, pitch: 65 };
    return { zoom: 16, pitch: 75 };
  }

  // Snap map to start when progress resets
  useEffect(() => {
    if (progress === 0 && !isPlaying) {
      routeDistanceCovered.current = 0;
      if (mapRef.current && pathPointsRef.current.length > 0) {
        const map = mapRef.current.getMap();
        const pt = pathPointsRef.current[0];
        const nextPt = pathPointsRef.current[5] || pathPointsRef.current[1] || pt;
        
        let initialZoom = zoomLevel;
        let initialPitch = lookAheadPitch;

        if (autoCamera && segmentsRef.current.length > 0) {
            const params = getAutoCameraParams(segmentsRef.current[0].dist);
            initialZoom = params.zoom;
            initialPitch = params.pitch;
        }

        map.easeTo({ center: pt as [number, number], zoom: initialZoom, pitch: initialPitch, bearing: getBearing(pt, nextPt), duration: 1000 });
      }
    }
  }, [progress, isPlaying, lookAheadPitch, zoomLevel, autoCamera]);

  // Main animation Loop
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || pathPointsRef.current.length < 2) return;

    let animationFrame: number;
    let lastTime = performance.now();

    const getPointAtFraction = (exactIdx: number) => {
        const idx = Math.floor(exactIdx);
        const p1 = pathPointsRef.current[idx];
        const p2 = pathPointsRef.current[idx + 1] || p1;
        if (!p1 || !p2) return p1;
        const f = exactIdx - idx;
        return [p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f] as Coordinates;
    };

    if (isPlaying) {
      if (!mapRef.current) return;
      const physicsState = mapRef.current as any;
      if (typeof physicsState._angularVel === 'undefined') {
          physicsState._angularVel = 0;
          physicsState._zoomVel = 0;
          physicsState._pitchVel = 0;
      }

      const animate = (time: number) => {
        const dt = (time - lastTime) / 1000;
        lastTime = time;

        if (dt > 1 || dt < 0) {
            animationFrame = requestAnimationFrame(animate);
            return;
        }

        const totalDistanceKm = routeDistanceRef.current;
        const speedKmS = totalDistanceKm > 0 ? (totalDistanceKm / targetDuration) : 0;
        const speedKmH = speedKmS * 3600;
        
        routeDistanceCovered.current += (speedKmS * dt);
        const progressFrac = totalDistanceKm > 0 ? Math.min(routeDistanceCovered.current / totalDistanceKm, 1) : 0;
        
        if (progressFrac >= 1) {
          onFinish();
          return;
        }

        const exactIndex = progressFrac * (pathPointsRef.current.length - 1);
        const currentPos = getPointAtFraction(exactIndex);

        if (!currentPos) return;
        
        const lookAheadIdx = Math.min(exactIndex + 20, pathPointsRef.current.length - 1);
        const targetPos = getPointAtFraction(lookAheadIdx);
        
        let mapZoom = map.getZoom();
        let mapPitch = map.getPitch();
        let mapBearing = map.getBearing();

        const TENSION = 20;
        const DAMPING = 8;
        
        // Bearing interpolation
        if (exactIndex < pathPointsRef.current.length - 1) {
          const targetBearing = getBearing(currentPos, targetPos);
          let diffBearing = targetBearing - mapBearing;
          while (diffBearing < -180) diffBearing += 360;
          while (diffBearing > 180) diffBearing -= 360;
          
          let accelB = diffBearing * TENSION - physicsState._angularVel * DAMPING;
          physicsState._angularVel += accelB * dt;
          mapBearing += physicsState._angularVel * dt;
        }

        // Zoom & Pitch physics
        let targetZoom = zoomLevel;
        let targetPitch = lookAheadPitch;

        if (autoCamera) {
            let currentSegDist = 5;
            for(let i=0; i<segmentsRef.current.length; i++){
                if (routeDistanceCovered.current <= segmentsRef.current[i].cumDist) {
                    currentSegDist = segmentsRef.current[i].dist;
                    break;
                }
            }
            const autoParams = getAutoCameraParams(currentSegDist);
            targetZoom = autoParams.zoom;
            targetPitch = autoParams.pitch;
        }

        let accelZ = (targetZoom - mapZoom) * (TENSION/2) - physicsState._zoomVel * DAMPING;
        physicsState._zoomVel += accelZ * dt;
        mapZoom += physicsState._zoomVel * dt;

        let accelP = (targetPitch - mapPitch) * (TENSION/2) - physicsState._pitchVel * DAMPING;
        physicsState._pitchVel += accelP * dt;
        mapPitch += physicsState._pitchVel * dt;

        map.jumpTo({
            center: [currentPos[0], currentPos[1]],
            zoom: mapZoom,
            pitch: mapPitch,
            bearing: mapBearing
        });

        if (map.getLayer('route')) {
            map.setPaintProperty('route', 'line-gradient', [
                'step',
                ['line-progress'],
                '#3b82f6',     // Traveled: blue
                progressFrac,  // Transition boundary
                '#4caf50'      // Remaining: green (Biofield main theme color)
            ]);
        }

        const currentProgPct = progressFrac * 100;
        
        onProgress(currentProgPct, {
          distance: routeDistanceCovered.current.toFixed(2) + ' km',
          speed: speedKmH.toFixed(0) + ' km/h',
          altitude: 'Satélite (Esri)'
        });

        animationFrame = requestAnimationFrame(animate);
      };
      
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, targetDuration, zoomLevel, lookAheadPitch, autoCamera, onProgress, onFinish]);

  const waypointsFeatures = {
    type: 'FeatureCollection',
    features: waypoints.map((pt, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pt },
        properties: { index: i + 1 }
    }))
  };

  const getPhotos = (obs: Observation) => {
    if (!obs.photosJson) return [];
    try {
      const parsed = JSON.parse(obs.photosJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: waypoints.length ? waypoints[0][0] : -3,
          latitude: waypoints.length ? waypoints[0][1] : 40,
          zoom: 15,
          pitch: 60,
          bearing: 0
        }}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={['route', 'waypoints-point']}
        cursor={isPlaying ? 'default' : 'grab'}
      >
        {routeLine && (
          <Source type="geojson" data={routeLine} lineMetrics={true}>
            <Layer
              id="route"
              type="line"
              paint={{
                'line-width': 7,
                'line-opacity': 0.9,
                'line-gradient': [
                    'step',
                    ['line-progress'],
                    '#3b82f6',
                    Math.max(progress / 100, 0.0001),
                    '#4caf50'
                ]
              }}
            />
          </Source>
        )}

        {waypoints.length > 0 && (
          <Source id="waypoints-src" type="geojson" data={waypointsFeatures as any}>
              <Layer 
                  id="waypoints-point" 
                  type="circle" 
                  paint={{ 
                      'circle-radius': 6, 
                      'circle-color': '#4caf50', 
                      'circle-stroke-width': 2, 
                      'circle-stroke-color': '#fff' 
                  }} 
              />
          </Source>
        )}

        {observations.map(obs => (
          <Marker 
              key={obs.id} 
              longitude={obs.longitude} 
              latitude={obs.latitude} 
              color="#3b82f6"
              onClick={(e: any) => {
                  e.originalEvent.stopPropagation();
                  setSelectedObs(obs);
              }} 
          />
        ))}

        {selectedObs && (
          <Popup
              longitude={selectedObs.longitude}
              latitude={selectedObs.latitude}
              anchor="bottom"
              onClose={() => setSelectedObs(null)}
              closeButton={true}
              closeOnClick={false}
              className="text-zinc-900 font-sans text-sm z-50 rounded-lg shadow-lg"
              offset={25}
          >
              <div style={{ padding: '4px', maxWidth: '220px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  <b style={{ fontSize: '13px', display: 'block', color: '#1a1a1a', marginBottom: '2px' }}>
                    {selectedObs.taxonName}
                  </b>
                  {selectedObs.title && (
                    <span style={{ fontSize: '12px', color: '#555', display: 'block', marginBottom: '4px' }}>
                      {selectedObs.title}
                    </span>
                  )}
                  {getPhotos(selectedObs)[0] && (
                    <img 
                      src={photoUrl(getPhotos(selectedObs)[0]) ?? ''} 
                      alt="" 
                      style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '6px', marginBottom: '6px', marginTop: '4px' }} 
                      onError={(e) => {
                        e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect width='18' height='18' x='3' y='3' rx='2' ry='2'/%3E%3Ccircle cx='9' cy='9' r='2'/%3E%3Cpath d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/%3E%3C/svg%3E";
                        e.currentTarget.style.objectFit = 'contain';
                        e.currentTarget.style.padding = '20px';
                        e.currentTarget.style.background = 'var(--bg)';
                      }}
                    />
                  )}
                  <span style={{ fontSize: '11px', color: '#888', display: 'block', marginBottom: '6px' }}>
                    📅 {new Date(selectedObs.observedAt).toLocaleDateString()}
                  </span>
                  {onObsClick && (
                    <button
                      onClick={() => {
                        onObsClick(selectedObs);
                        setSelectedObs(null);
                      }}
                      style={{
                        width: '100%',
                        backgroundColor: 'var(--green, #2e7d32)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      Ver detalle completo →
                    </button>
                  )}
              </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
