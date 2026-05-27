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
      backgroundColor: 'var(--playback-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px 24px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 20
    }}>
      
      {/* Stats Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: 'var(--green-light)',
          borderRadius: 'var(--radius)',
          padding: '12px',
          textAlign: 'center',
          border: '1px solid rgba(46, 125, 50, 0.08)'
        }}>
          <p style={{
            fontSize: '11px',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 4px 0',
            fontWeight: 600
          }}>Distancia</p>
          <p style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'var(--text)',
            margin: 0,
            fontFamily: 'monospace'
          }}>{stats.distance}</p>
        </div>
        
        <div style={{
          backgroundColor: 'var(--green-light)',
          borderRadius: 'var(--radius)',
          padding: '12px',
          textAlign: 'center',
          border: '1px solid rgba(46, 125, 50, 0.08)'
        }}>
          <p style={{
            fontSize: '11px',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            margin: '0 0 4px 0',
            fontWeight: 600
          }}>Velocidad</p>
          <p style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'var(--text)',
            margin: 0,
            fontFamily: 'monospace'
          }}>{stats.speed}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          height: '8px',
          backgroundColor: 'var(--border)',
          borderRadius: '9999px',
          overflow: 'hidden'
        }}>
          <div 
            style={{
              height: '100%',
              backgroundColor: 'var(--green)', // Use Biofield green
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
            color: hoverReset ? 'var(--green)' : 'var(--muted)',
            backgroundColor: hoverReset ? 'var(--green-light)' : 'transparent',
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
            backgroundColor: hoverPlay ? 'var(--green-dark)' : 'var(--green)',
            color: '#ffffff',
            borderRadius: '9999px',
            cursor: 'pointer',
            border: 'none',
            outline: 'none',
            transition: 'all 0.2s',
            transform: hoverPlay ? 'scale(1.05)' : 'scale(1)',
            boxShadow: '0 10px 15px -3px rgba(46, 125, 50, 0.3)'
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
