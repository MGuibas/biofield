export type Coordinates = [number, number]; // [lng, lat]

export interface Observation {
  id: string;
  coords: Coordinates;
  text: string;
}

export interface AppState {
  isPlaying: boolean;
  targetDuration: number;
  progress: number;
  zoomLevel: number;
  lookAheadPitch: number;
  autoCamera: boolean;
  interactionMode: 'route' | 'observation';
  stats: {
    distance: string;
    speed: string;
    altitude: string;
  };
}
