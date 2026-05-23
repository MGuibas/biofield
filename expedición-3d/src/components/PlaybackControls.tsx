import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import type { AppState } from '../types';

interface PlaybackControlsProps {
  state: AppState;
  onPlayPause: () => void;
  onReset: () => void;
}

export default function PlaybackControls({ state, onPlayPause, onReset }: PlaybackControlsProps) {

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-zinc-900/90 backdrop-blur-md rounded-2xl p-6 border border-zinc-700 shadow-2xl z-20">
      
      {/* Stats Panel */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-zinc-800/80 rounded-xl p-3 text-center border border-zinc-700/50">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">Distancia</p>
          <p className="text-xl font-bold text-white font-mono">{state.stats.distance}</p>
        </div>
        <div className="bg-zinc-800/80 rounded-xl p-3 text-center border border-zinc-700/50">
          <p className="text-xs text-zinc-400 uppercase tracking-wider">Velocidad</p>
          <p className="text-xl font-bold text-white font-mono">{state.stats.speed}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-orange-500 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${state.progress}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-8">
        <button 
          onClick={onReset}
          className="p-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          title="Reiniciar"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button 
          onClick={onPlayPause}
          className="w-14 h-14 flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-orange-500/20"
        >
          {state.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </button>
      </div>
    </div>
  );
}
