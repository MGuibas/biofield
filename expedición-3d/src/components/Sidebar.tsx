import React from 'react';
import { MapPin, Settings2, Video, Clock, Trash, Map as MapIcon, Type } from 'lucide-react';
import type { Coordinates, Observation } from '../types';

interface SidebarProps {
  waypoints: Coordinates[];
  observations: Observation[];
  zoomLevel: number;
  lookAheadPitch: number;
  autoCamera: boolean;
  targetDuration: number;
  interactionMode: 'route' | 'observation';
  onWaypointsChange: (points: Coordinates[]) => void;
  onObservationsChange: (obs: Observation[]) => void;
  onZoomLevelChange: (val: number) => void;
  onPitchChange: (val: number) => void;
  onAutoCameraChange: (val: boolean) => void;
  onDurationChange: (val: number) => void;
  onInteractionModeChange: (mode: 'route' | 'observation') => void;
}

export default function Sidebar({ waypoints, observations, zoomLevel, lookAheadPitch, autoCamera, targetDuration, interactionMode, onWaypointsChange, onObservationsChange, onZoomLevelChange, onPitchChange, onAutoCameraChange, onDurationChange, onInteractionModeChange }: SidebarProps) {
  const routes = [
    { name: 'Los Andes', waypoints: [[-69.9312, -32.6531] as Coordinates, [-69.9700, -32.7500] as Coordinates, [-70.0150, -32.8331] as Coordinates] },
    { name: 'Alpes Suizos', waypoints: [[7.9715, 46.5824] as Coordinates, [7.9900, 46.5850] as Coordinates, [8.0123, 46.5812] as Coordinates] },
    { name: 'Gran Cañón', waypoints: [[-112.1129, 36.1069] as Coordinates, [-112.1000, 36.0800] as Coordinates, [-112.0833, 36.0664] as Coordinates] },
  ];

  return (
    <div className="w-[340px] bg-zinc-900 text-white p-6 flex flex-col h-full border-r border-zinc-800 shrink-0 relative z-10 shadow-2xl overflow-y-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-orange-500 p-2 rounded-lg">
          <MapPin className="text-white w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Expedición 3D</h1>
      </div>

      <div className="space-y-8 flex-1">
        {/* Selector de Modo */}
        <div className="bg-zinc-800 p-1 rounded-lg flex gap-1">
            <button
                onClick={() => onInteractionModeChange('route')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${interactionMode === 'route' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
                <MapIcon className="w-4 h-4" /> Ruta
            </button>
            <button
                onClick={() => onInteractionModeChange('observation')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${interactionMode === 'observation' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
                <Type className="w-4 h-4" /> Observar
            </button>
        </div>

        {/* Listado dinámico según modo */}
        {interactionMode === 'route' ? (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Puntos de Ruta
              </h2>
              
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">Haz clic en cualquier parte del mapa para añadir puntos al recorrido en orden.</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {waypoints.map((wp, i) => (
                    <div key={i} className="bg-zinc-800 p-2 px-3 rounded-lg text-xs border border-zinc-700 flex justify-between items-center text-zinc-300">
                      <span>Punto {i + 1}</span>
                      <span className="font-mono text-[10px] text-zinc-500">{wp[1].toFixed(4)}, {wp[0].toFixed(4)}</span>
                    </div>
                  ))}
                  {waypoints.length === 0 && (
                    <div className="text-sm text-zinc-500 italic">No hay puntos definidos.</div>
                  )}
                </div>

                <button 
                    onClick={() => onWaypointsChange([])}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 mt-2 rounded bg-zinc-800 text-red-400 hover:bg-zinc-700 hover:text-red-300 transition text-sm"
                >
                    <Trash className="w-4 h-4" /> Limpiar Puntos
                </button>
              </div>
            </div>
        ) : (
            <div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Type className="w-4 h-4" /> Observaciones
              </h2>
              
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">Haz clic en el mapa para anotar observaciones importantes a lo largo del trayecto.</p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {observations.map((obs) => (
                    <div key={obs.id} className="bg-zinc-800 p-3 rounded-lg text-xs border border-zinc-700 space-y-2">
                      <div className="flex justify-between items-center mb-1">
                          <span className="font-mono text-[10px] text-zinc-500">{obs.coords[1].toFixed(4)}, {obs.coords[0].toFixed(4)}</span>
                          <button 
                              onClick={() => onObservationsChange(observations.filter(o => o.id !== obs.id))}
                              className="text-zinc-500 hover:text-red-400 transition"
                          >
                              <Trash className="w-3 h-3" />
                          </button>
                      </div>
                      <textarea
                          className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-300 resize-none outline-none focus:border-orange-500 transition-colors"
                          rows={2}
                          value={obs.text}
                          onChange={(e) => {
                              onObservationsChange(observations.map(o => o.id === obs.id ? { ...o, text: e.target.value } : o));
                          }}
                      />
                    </div>
                  ))}
                  {observations.length === 0 && (
                    <div className="text-sm text-zinc-500 italic">No hay observaciones definidas.</div>
                  )}
                </div>
              </div>
            </div>
        )}

        {/* Configuración de Animación y Cámara */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Video className="w-4 h-4" /> Vuelo y Cámara
          </h2>
          
          <div className="space-y-6">
            {/* Animación */}
            <div>
              <label className="flex justify-between text-xs text-zinc-500 mb-2">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Tiempo de vuelo</span>
                <span className="text-white font-mono">{targetDuration}s</span>
              </label>
              <input 
                type="range" 
                min="15" max="60" step="5" 
                value={targetDuration} 
                onChange={(e) => onDurationChange(Number(e.target.value))} 
                className="w-full accent-orange-500"
              />
              <p className="text-[10px] text-zinc-600 mt-1">El dron ajustará su velocidad para terminar el viaje en este tiempo.</p>
            </div>

            <div className="pt-4 border-t border-zinc-800 space-y-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300 font-medium cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      checked={autoCamera}
                      onChange={(e) => onAutoCameraChange(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-8 h-4 rounded-full transition bg-zinc-800 ${autoCamera ? 'bg-orange-500' : ''}`}></div>
                    <div className={`absolute w-3 h-3 bg-white rounded-full left-0.5 top-0.5 transition-transform ${autoCamera ? 'translate-x-4' : ''}`}></div>
                  </div>
                  Cámara Dinámica Inteligente
              </label>
              {autoCamera && (
                <p className="text-[10px] text-zinc-500">Ajusta el zoom y la inclinación automáticamente dependiendo de las distancias entre puntos definidos.</p>
              )}

              {!autoCamera && (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div>
                    <label className="flex justify-between text-xs text-zinc-500 mb-2">
                      <span>Zoom (Cercanía)</span>
                      <span className="text-white font-mono">{zoomLevel}x</span>
                    </label>
                    <input 
                      type="range" 
                      min="12" max="18" step="0.5" 
                      value={zoomLevel} 
                      onChange={(e) => onZoomLevelChange(Number(e.target.value))} 
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-xs text-zinc-500 mb-2">
                      <span>Inclinación de visión (Pitch)</span>
                      <span className="text-white font-mono">{lookAheadPitch}°</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" max="85" step="1" 
                      value={lookAheadPitch} 
                      onChange={(e) => onPitchChange(Number(e.target.value))} 
                      className="w-full accent-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rutas de Ejemplo */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Rutas de Ejemplo
          </h2>
          <div className="space-y-2">
            {routes.map((rt) => (
              <button
                key={rt.name}
                onClick={() => {
                  onWaypointsChange(rt.waypoints);
                }}
                className="w-full text-left px-4 py-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-700 border border-transparent hover:border-zinc-600 transition-colors text-sm"
              >
                {rt.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
