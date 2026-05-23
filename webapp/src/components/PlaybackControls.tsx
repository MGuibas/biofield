import { useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface PlaybackControlsProps {
  isPlaying: boolean;
  progress: number;
  stats: {
    distance: string;
    speed: string;
    altitude: string;
  };
  onPlayPause: () => void;
  onReset: () => void;
}

export default function PlaybackControls({ isPlaying, progress, stats, onPlayPause, onReset }: PlaybackControlsProps) {
  const [hoverReset, setHoverReset] = useState(false);
  const [hoverPlay, setHoverPlay] = useState(false);

  return (
    <div style={{
      position: 'absolute',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '600px',
      backgroundColor: 'rgba(24, 24, 27, 0.92)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: '20px',
      padding: '20px 24px',
      border: '1px solid rgba(63, 63, 70, 0.5)',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
      zIndex: 20,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      
      {/* Stats Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'rgba(39, 39, 42, 0.7)',
          borderRadius: '12px',
          padding: '12px',
          textAlign: 'center',
          border: '1px solid rgba(63, 63, 70, 0.3)'
        }}>
          <p style={{
            fontSize: '11px',
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 4px 0',
            fontWeight: 600
          }}>Distancia</p>
          <p style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ffffff',
            margin: 0,
            fontFamily: 'monospace'
          }}>{stats.distance}</p>
        </div>
        
        <div style={{
          backgroundColor: 'rgba(39, 39, 42, 0.7)',
          borderRadius: '12px',
          padding: '12px',
          textAlign: 'center',
          border: '1px solid rgba(63, 63, 70, 0.3)'
        }}>
          <p style={{
            fontSize: '11px',
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 4px 0',
            fontWeight: 600
          }}>Velocidad</p>
          <p style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ffffff',
            margin: 0,
            fontFamily: 'monospace'
          }}>{stats.speed}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          height: '8px',
          backgroundColor: 'rgba(63, 63, 70, 0.5)',
          borderRadius: '9999px',
          overflow: 'hidden'
        }}>
          <div 
            style={{
              height: '100%',
              backgroundColor: '#4caf50', // Use Biofield green
              borderRadius: '9999px',
              width: `${progress}%`,
              transition: 'width 0.30s linear'
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px'
      }}>
        <button 
          onClick={onReset}
          onMouseEnter={() => setHoverReset(true)}
          onMouseLeave={() => setHoverReset(false)}
          style={{
            padding: '12px',
            color: hoverReset ? '#ffffff' : '#a1a1aa',
            backgroundColor: hoverReset ? 'rgba(63, 63, 70, 0.5)' : 'transparent',
            borderRadius: '9999px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            outline: 'none'
          }}
          title="Reiniciar"
        >
          <RotateCcw style={{ width: '20px', height: '20px' }} />
        </button>

        <button 
          onClick={onPlayPause}
          onMouseEnter={() => setHoverPlay(true)}
          onMouseLeave={() => setHoverPlay(false)}
          style={{
            width: '56px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: hoverPlay ? '#43a047' : '#4caf50', // Green buttons
            color: '#ffffff',
            borderRadius: '9999px',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            transition: 'all 0.2s',
            transform: hoverPlay ? 'scale(1.05)' : 'scale(1)',
            boxShadow: '0 10px 15px -3px rgba(76, 175, 80, 0.3)'
          }}
        >
          {isPlaying ? (
            <Pause style={{ width: '24px', height: '24px' }} />
          ) : (
            <Play style={{ width: '24px', height: '24px', marginLeft: '3px' }} />
          )}
        </button>
      </div>
    </div>
  );
}
