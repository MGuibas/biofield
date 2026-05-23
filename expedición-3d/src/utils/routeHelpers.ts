import * as turf from '@turf/turf';
import type { Coordinates } from '../types';
import type { Feature, LineString } from 'geojson';

export function calculateRoute(waypoints: Coordinates[]): Feature<LineString> | null {
  if (!waypoints || waypoints.length < 2) return null;
  const line = turf.lineString(waypoints);
  if (waypoints.length > 2) {
    try {
      return turf.bezierSpline(line, { sharpness: 0.5, resolution: 10000 });
    } catch (e) {
      return line;
    }
  }
  return line;
}

/**
 * Creates an interpolated path for the camera to follow.
 * @param line The original route LineString
 * @param stepKm Distance between interpolation points in km
 * @returns Array of coordinates along the route
 */
export function interpolateRoute(line: Feature<LineString> | null, stepKm: number = 0.005): Coordinates[] {
  if (!line || !line.geometry || !line.geometry.coordinates) return [];
  
  const points: Coordinates[] = [];
  const distance = turf.length(line, { units: 'kilometers' });
  const numSteps = Math.max(Math.floor(distance / stepKm), 2);

  for (let i = 0; i <= numSteps; i++) {
    const segmentDistance = (i / numSteps) * distance;
    const point = turf.along(line, segmentDistance, { units: 'kilometers' });
    points.push(point.geometry.coordinates as Coordinates);
  }

  return points;
}

/**
 * Calculates bearing between two points
 */
export function getBearing(start: Coordinates, end: Coordinates): number {
  if (!start || !end || start.length < 2 || end.length < 2) return 0;
  return turf.bearing(turf.point(start), turf.point(end));
}
