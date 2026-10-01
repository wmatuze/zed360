import type { LocationCoordinates } from '@zed360/contracts';

// PostGIS points are stored as x = longitude, y = latitude.
export function toPoint(coordinates: LocationCoordinates | null | undefined) {
  return coordinates
    ? { x: coordinates.longitude, y: coordinates.latitude }
    : null;
}

export function fromPoint(
  point: { x: number; y: number } | null,
): LocationCoordinates | null {
  return point ? { latitude: point.y, longitude: point.x } : null;
}
