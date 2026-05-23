import React, { useRef, useEffect, useState } from 'react';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/maplibre';
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import { interpolateRoute, getBearing, calculateRoute } from '../utils/routeHelpers';
import * as turf from '@turf/turf';
import type { Feature, LineString } from 'geojson';
import type { Coordinates, AppState, Observation } from '../types';

interface Map3DProps {
  waypoints: Coordinates[];
  observations: Observation[];
  isPlaying: boolean;
  targetDuration: number;
  progress: number;
  zoomLevel: number;
  lookAheadPitch: number;
  autoCamera: boolean;
  onMapClick: (point: Coordinates) => void;
  onProgress: (progress: number, stats: AppState['stats']) => void;
  onFinish: () => void;
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
  waypoints, observations, isPlaying, targetDuration, progress, zoomLevel, lookAheadPitch, autoCamera, onMapClick, onProgress, onFinish
}: Map3DProps) {
  const mapRef = useRef<MapRef>(null);
  const [routeLine, setRouteLine] = useState<Feature<LineString> | null>(null);
  const [selectedObs, setSelectedObs] = useState<string | null>(null);

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
      // Init physics state if needed
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

        // Dynamically calculate speed to finish exact trajectory in `targetDuration` seconds
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
        
        // Target para la dirección (usamos solo lookAhead base para que sea responsivo, la curva lo hace suave)
        const lookAheadIdx = Math.min(exactIndex + 20, pathPointsRef.current.length - 1);
        const targetPos = getPointAtFraction(lookAheadIdx);
        
        let mapZoom = map.getZoom();
        let mapPitch = map.getPitch();
        let mapBearing = map.getBearing();

        const TENSION = 20;
        const DAMPING = 8;
        
        // Angular string (Bearing)
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

        // JumpTo smooth
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
                '#3b82f6',     // traveled color
                progressFrac,  // border
                '#f97316'      // remaining color
            ]);
        }

        const currentProgPct = progressFrac * 100;
        
        onProgress(currentProgPct, {
          distance: routeDistanceCovered.current.toFixed(2) + ' km',
          speed: speedKmH.toFixed(0) + ' km/h',
          altitude: 'OSM Flat (0m)' // Ya no tenemos terreno
        });

        animationFrame = requestAnimationFrame(animate);
      };
      
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, targetDuration, zoomLevel, lookAheadPitch, autoCamera, onProgress, onFinish]);

  const handleMapClick = (e: MapLayerMouseEvent) => {
    if (!e.defaultPrevented) {
        onMapClick([e.lngLat.lng, e.lngLat.lat]);
    }
  };

  const waypointsFeatures = {
    type: 'FeatureCollection',
    features: waypoints.map((pt, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pt },
        properties: { index: i + 1 }
    }))
  };

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: waypoints.length ? waypoints[0][0] : -69.9312,
        latitude: waypoints.length ? waypoints[0][1] : -32.6531,
        zoom: 15,
        pitch: 60,
        bearing: 0
      }}
      mapStyle={mapStyle}
      style={{width: '100%', height: '100%'}}
      onClick={handleMapClick}
      interactiveLayerIds={['route', 'waypoints-point']}
      cursor={isPlaying ? 'default' : 'crosshair'}
    >
      {routeLine && (
        <Source type="geojson" data={routeLine} lineMetrics={true}>
          <Layer
            id="route"
            type="line"
            paint={{
              'line-width': 8,
              'line-opacity': 0.8,
              'line-gradient': [
                  'step',
                  ['line-progress'],
                  '#3b82f6',
                  Math.max(progress / 100, 0.0001),
                  '#f97316'
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
                    'circle-radius': 8, 
                    'circle-color': '#f97316', 
                    'circle-stroke-width': 3, 
                    'circle-stroke-color': '#fff' 
                }} 
            />
        </Source>
      )}

      {observations.map(obs => (
        <Marker 
            key={obs.id} 
            longitude={obs.coords[0]} 
            latitude={obs.coords[1]} 
            color="#3b82f6"
            onClick={e => {
                e.originalEvent.stopPropagation();
                setSelectedObs(obs.id);
            }} 
        />
      ))}

      {selectedObs && observations.find(o => o.id === selectedObs) && (
        <Popup
            longitude={observations.find(o => o.id === selectedObs)!.coords[0]}
            latitude={observations.find(o => o.id === selectedObs)!.coords[1]}
            anchor="bottom"
            onClose={() => setSelectedObs(null)}
            closeButton={true}
            closeOnClick={false}
            className="text-zinc-900 font-sans text-sm z-50 rounded-lg shadow-lg"
            offset={25}
        >
            <div className="p-1 px-2 max-w-[200px] text-zinc-800 font-medium whitespace-pre-wrap">
                {observations.find(o => o.id === selectedObs)!.text}
            </div>
        </Popup>
      )}
    </Map>
  );
}
