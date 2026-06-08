import type { CoordinateField } from "@/lib/models/trip";

/** Last-resort map center when no drivers, trips, or company default exist. */
export const MAP_FALLBACK_VIEW = { longitude: 151.2093, latitude: -33.8688, zoom: 11 };

export type MapViewState = { longitude: number; latitude: number; zoom: number };

export function hasValidCoordinate(coordinate: CoordinateField) {
  return coordinate.latitude !== 0 || coordinate.longitude !== 0;
}

export function boundsFromPoints(points: CoordinateField[]) {
  const lngs = points.map((p) => p.longitude);
  const lats = points.map((p) => p.latitude);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  ] as [[number, number], [number, number]];
}

export function centerFromPoints(points: CoordinateField[], zoom = 11) {
  const longitude = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
  const latitude = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  return { longitude, latitude, zoom };
}

export function coordinateFromLatLng(lat: number, lng: number): CoordinateField {
  return { latitude: lat, longitude: lng };
}
