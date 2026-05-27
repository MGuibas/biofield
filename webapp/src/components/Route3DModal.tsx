import { useState, useCallback, useMemo } from 'react';
import { X, Clock, Video, Compass, MapPin, Info, Ruler, Eye } from 'lucide-react';
import Map3D from './Map3D';
import PlaybackControls from './PlaybackControls';
import { parseTrackPoints } from '../utils/routeHelpers';
import type { Route, Observation } from '../types';

interface Route3DModalProps {
  route: Route;
  obsInRoute: Observation[];
  onClose: () => void;
  onObsClick?: (obs: Observation) => void;
}

export default function Route3DModal({ route, obsInRoute, onClose, onObsClick }: Route3DModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetDuration, setTargetDuration] = useState(30); // 30 seconds default
  const [progress, setProgress] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(15.5);
  const [lookAheadPitch, setLookAheadPitch] = useState(65);
  const [autoCamera, setAutoCamera] = useState(true);
  const [stats, setStats] = useState({
    distance: '0.00 km',
    speed: '0 km/h',
    altitude: 'Satélite (Esri)'
  });

  const waypoints = useMemo(() => {
    return parseTrackPoints(route.trackPointsJson);
  }, [route.trackPointsJson]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(p => !p);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
    setStats({
      distance: '0.00 km',
      speed: '0 km/h',
      altitude: 'Satélite (Esri)'
    });
  }, []);

  const handleProgress = useCallback((prog: number, currentStats: typeof stats) => {
    setProgress(prog);
    setStats(currentStats);
  }, []);

  const handleFinish = useCallback(() => {
    setIsPlaying(false);
    setProgress(100);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--bg)',
      zIndex: 9999,
      display: 'flex',
      overflow: 'hidden',
      color: 'var(--text)'
    }}>
      
      {/* Sidebar Panel */}
      <div style={{
        width: '350px',
        backgroundColor: 'var(--white)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flexShrink: 0,
        zIndex: 10,
        boxShadow: 'var(--shadow-lg)',
        overflowY: 'auto'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '24px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--white)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              backgroundColor: 'var(--green, #2e7d32)',
              borderRadius: '8px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Compass style={{ color: '#fff', width: '20px', height: '20px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Simulación 3D</h2>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Biofield Flight Viewer</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              outline: 'none'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--green-light)'; e.currentTarget.style.color = 'var(--green)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
            title="Cerrar"
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Sidebar Content */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '28px', flex: 1 }}>
          
          {/* Route Info */}
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px'
            }}>
              <Info style={{ width: '13px', height: '13px' }} /> Detalles de la Ruta
            </span>
            <div style={{
              backgroundColor: 'var(--bg)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text)' }}>{route.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 12px 0' }}>
                Registrada el {new Date(route.startedAt).toLocaleDateString()}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: 'var(--radius)', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Ruler style={{ width: '12px', height: '12px' }} /> {(route.distanceMeters / 1000).toFixed(2)} km
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: 'var(--radius)', backgroundColor: 'var(--green-light)', color: 'var(--green)', border: '1px solid rgba(46, 125, 50, 0.2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Eye style={{ width: '12px', height: '12px' }} /> {obsInRoute.length} obs.
                </span>
              </div>
              {route.notes && (
                <p style={{
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: 'var(--muted)',
                  margin: '12px 0 0 0',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  fontStyle: 'italic'
                }}>{route.notes}</p>
              )}
            </div>
          </div>

          {/* Dron settings */}
          <div>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '14px'
            }}>
              <Video style={{ width: '13px', height: '13px' }} /> Configuración de Vuelo
            </span>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Fly duration */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock style={{ width: '13px', height: '13px' }}/> Duración del Vuelo</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text)', fontFamily: 'monospace' }}>{targetDuration}s</span>
                </label>
                <input 
                  type="range" 
                  min="15" 
                  max="60" 
                  step="5" 
                  value={targetDuration} 
                  onChange={(e) => setTargetDuration(Number(e.target.value))} 
                  style={{
                    width: '100%',
                    accentColor: 'var(--green)',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Smart Camera Mode */}
              <div style={{
                paddingTop: '16px',
                borderTop: '1px solid var(--border)'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: 'var(--text)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={autoCamera}
                      onChange={(e) => setAutoCamera(e.target.checked)}
                      style={{
                        position: 'absolute',
                        opacity: 0,
                        width: 0,
                        height: 0
                      }}
                    />
                    <div style={{
                      width: '36px',
                      height: '20px',
                      borderRadius: '10px',
                      backgroundColor: autoCamera ? 'var(--green)' : '#3f3f46',
                      transition: 'background-color 0.2s',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        backgroundColor: '#fff',
                        transition: 'transform 0.2s',
                        transform: autoCamera ? 'translateX(16px)' : 'translateX(0)'
                      }} />
                    </div>
                  </div>
                  Cámara Dinámica Inteligente
                </label>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  Ajusta automáticamente el zoom e inclinación según la distancia y curvas del trayecto.
                </p>
              </div>

              {/* Manual controls if Smart Camera is off */}
              {!autoCamera && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: '14px',
                  backgroundColor: 'var(--bg)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)'
                }}>
                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
                      <span>Zoom (Cercanía)</span>
                      <span style={{ color: 'var(--text)', fontWeight: 'bold', fontFamily: 'monospace' }}>{zoomLevel}x</span>
                    </label>
                    <input 
                      type="range" 
                      min="12" 
                      max="18" 
                      step="0.5" 
                      value={zoomLevel} 
                      onChange={(e) => setZoomLevel(Number(e.target.value))} 
                      style={{ width: '100%', accentColor: 'var(--green)', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)', marginBottom: '6px' }}>
                      <span>Ángulo de visión (Pitch)</span>
                      <span style={{ color: 'var(--text)', fontWeight: 'bold', fontFamily: 'monospace' }}>{lookAheadPitch}°</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="85" 
                      step="1" 
                      value={lookAheadPitch} 
                      onChange={(e) => setLookAheadPitch(Number(e.target.value))} 
                      style={{ width: '100%', accentColor: 'var(--green)', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Observations List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px'
            }}>
              <MapPin style={{ width: '13px', height: '13px' }} /> Observaciones ({obsInRoute.length})
            </span>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              maxHeight: '220px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingRight: '4px'
            }}>
              {obsInRoute.map(obs => (
                <div 
                  key={obs.id}
                  onClick={() => onObsClick?.(obs)}
                  style={{
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{obs.taxonName}</span>
                  {obs.title && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{obs.title}</span>}
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                    {obs.latitude.toFixed(5)}, {obs.longitude.toFixed(5)}
                  </span>
                </div>
              ))}
              {obsInRoute.length === 0 && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  padding: '20px 0'
                }}>
                  No hay observaciones registradas en esta ruta.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Main Map Viewport */}
      <div style={{
        flex: 1,
        height: '100%',
        position: 'relative'
      }}>
        
        {waypoints.length < 2 ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg)',
            color: 'var(--muted)',
            gap: '12px'
          }}>
            <Compass style={{ width: '48px', height: '48px', color: 'var(--border)' }} />
            <p style={{ fontSize: '14px' }}>Esta ruta no posee suficientes coordenadas grabadas para generar una trayectoria 3D.</p>
          </div>
        ) : (
          <>
            <Map3D 
              waypoints={waypoints}
              observations={obsInRoute}
              isPlaying={isPlaying}
              targetDuration={targetDuration}
              progress={progress}
              zoomLevel={zoomLevel}
              lookAheadPitch={lookAheadPitch}
              autoCamera={autoCamera}
              onProgress={handleProgress}
              onFinish={handleFinish}
              onObsClick={onObsClick}
            />

            <PlaybackControls 
              isPlaying={isPlaying}
              progress={progress}
              stats={stats}
              onPlayPause={handlePlayPause}
              onReset={handleReset}
            />
          </>
        )}

      </div>

    </div>
  );
}
