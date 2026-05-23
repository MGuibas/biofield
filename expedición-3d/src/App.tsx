import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import PlaybackControls from './components/PlaybackControls';
import Map3D from './components/Map3D';
import type { Coordinates, AppState, Observation } from './types';

// Default route: Los Andes
const DEFAULT_WAYPOINTS: Coordinates[] = [
  [-69.9312, -32.6531], 
  [-69.9700, -32.7500],
  [-70.0150, -32.8331]
];

export default function App() {
  const [waypoints, setWaypoints] = useState<Coordinates[]>(DEFAULT_WAYPOINTS);
  const [observations, setObservations] = useState<Observation[]>([
    { id: '1', coords: [-69.9500, -32.7000], text: 'Avistamiento de cóndor' }
  ]);
  
  const [appState, setAppState] = useState<AppState>({
    isPlaying: false,
    targetDuration: 30, // 30 seconds default
    progress: 0,
    zoomLevel: 15,
    lookAheadPitch: 60,
    autoCamera: true,
    interactionMode: 'route',
    stats: {
      distance: '0.00 km',
      speed: '0 km/h',
      altitude: 'N/A'
    }
  });

  const handlePlayPause = useCallback(() => setAppState(s => ({ ...s, isPlaying: !s.isPlaying })), []);
  
  const handleReset = useCallback(() => setAppState(s => ({ 
    ...s, 
    isPlaying: false, 
    progress: 0,
    stats: {
      distance: '0.00 km',
      speed: '0 km/h',
      altitude: 'N/A'
    }
  })), []);

  const handleDurationChange = useCallback((targetDuration: number) => setAppState(s => ({ ...s, targetDuration })), []);
  const handleZoomLevelChange = useCallback((zoomLevel: number) => setAppState(s => ({ ...s, zoomLevel })), []);
  const handlePitchChange = useCallback((lookAheadPitch: number) => setAppState(s => ({ ...s, lookAheadPitch })), []);
  const handleAutoCameraChange = useCallback((autoCamera: boolean) => setAppState(s => ({ ...s, autoCamera })), []);
  const handleInteractionModeChange = useCallback((mode: 'route' | 'observation') => setAppState(s => ({ ...s, interactionMode: mode })), []);

  const handleProgress = useCallback((progress: number, stats: AppState['stats']) => {
    setAppState(s => ({ ...s, progress, stats }));
  }, []);

  const handleFinish = useCallback(() => setAppState(s => ({ ...s, isPlaying: false, progress: 100 })), []);

  const handleMapClick = useCallback((pt: Coordinates) => {
    if (appState.interactionMode === 'route') {
      setWaypoints(prev => [...prev, pt]);
      handleReset();
    } else {
      setObservations(prev => [...prev, { id: crypto.randomUUID(), coords: pt, text: 'Nueva observación...' }]);
    }
  }, [appState.interactionMode, handleReset]);

  const handleWaypointsChange = useCallback((pts: Coordinates[]) => {
    setWaypoints(pts);
    handleReset();
  }, [handleReset]);

  const handleObservationsChange = useCallback((obs: Observation[]) => {
    setObservations(obs);
  }, []);

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white font-sans overflow-hidden">
      <Sidebar 
        waypoints={waypoints} 
        observations={observations}
        zoomLevel={appState.zoomLevel}
        lookAheadPitch={appState.lookAheadPitch}
        autoCamera={appState.autoCamera}
        targetDuration={appState.targetDuration}
        interactionMode={appState.interactionMode}
        onWaypointsChange={handleWaypointsChange} 
        onObservationsChange={handleObservationsChange}
        onZoomLevelChange={handleZoomLevelChange}
        onPitchChange={handlePitchChange}
        onAutoCameraChange={handleAutoCameraChange}
        onDurationChange={handleDurationChange}
        onInteractionModeChange={handleInteractionModeChange}
      />
      
      <main className="flex-1 relative">
        <Map3D 
          waypoints={waypoints}
          observations={observations}
          isPlaying={appState.isPlaying}
          targetDuration={appState.targetDuration}
          progress={appState.progress}
          zoomLevel={appState.zoomLevel}
          lookAheadPitch={appState.lookAheadPitch}
          autoCamera={appState.autoCamera}
          onMapClick={handleMapClick}
          onProgress={handleProgress}
          onFinish={handleFinish}
        />
        
        <PlaybackControls 
          state={appState}
          onPlayPause={handlePlayPause}
          onReset={handleReset}
        />
      </main>
    </div>
  );
}
