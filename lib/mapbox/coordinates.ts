import type { CoordinateField } from "@/lib/models/trip";

/** Last-resort map center when no drivers, trips, or company default exist. */
export const MAP_FALLBACK_VIEW = { longitude: 151.2093, latitude: -33.8688, zoom: 11 };

export type MapViewState = { longitude: number; latitude: number; zoom: number };

/** Mapbox `fitBounds` southwest / northeast corners: `[[minLng, minLat], [maxLng, maxLat]]`. */
export type MapBounds = [[number, number], [number, number]];

/** Accumulator for camera framing without allocating a point per polyline vertex. */
export type LngLatBBox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  count: number;
};

export function hasValidCoordinate(coordinate: CoordinateField) {
  return coordinate.latitude !== 0 || coordinate.longitude !== 0;
}

export function includeLngLat(
  bbox: LngLatBBox | null,
  lng: number,
  lat: number
): LngLatBBox | null {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return bbox;
  if (!bbox || bbox.count === 0) {
    return { minLng: lng, minLat: lat, maxLng: lng, maxLat: lat, count: 1 };
  }
  return {
    minLng: Math.min(bbox.minLng, lng),
    minLat: Math.min(bbox.minLat, lat),
    maxLng: Math.max(bbox.maxLng, lng),
    maxLat: Math.max(bbox.maxLat, lat),
    count: bbox.count + 1
  };
}

export function includeCoordinate(
  bbox: LngLatBBox | null,
  coordinate: CoordinateField | null | undefined
): LngLatBBox | null {
  if (!coordinate || !hasValidCoordinate(coordinate)) return bbox;
  return includeLngLat(bbox, coordinate.longitude, coordinate.latitude);
}

/** Expand a bbox with GeoJSON LineString `[lng, lat]` pairs (single clone, then mutate). */
export function includeLngLatPairs(
  bbox: LngLatBBox | null,
  pairs: Array<[number, number] | number[]> | undefined
): LngLatBBox | null {
  if (!pairs?.length) return bbox;

  let next: LngLatBBox | null = bbox
    ? {
        minLng: bbox.minLng,
        minLat: bbox.minLat,
        maxLng: bbox.maxLng,
        maxLat: bbox.maxLat,
        count: bbox.count
      }
    : null;

  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const lng = Number(pair[0]);
    const lat = Number(pair[1]);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (!next || next.count === 0) {
      next = { minLng: lng, minLat: lat, maxLng: lng, maxLat: lat, count: 1 };
      continue;
    }
    next.minLng = Math.min(next.minLng, lng);
    next.minLat = Math.min(next.minLat, lat);
    next.maxLng = Math.max(next.maxLng, lng);
    next.maxLat = Math.max(next.maxLat, lat);
    next.count += 1;
  }

  return next;
}

export function mapBoundsFromBBox(bbox: LngLatBBox): MapBounds {
  return [
    [bbox.minLng, bbox.minLat],
    [bbox.maxLng, bbox.maxLat]
  ];
}

export function centerFromBBox(bbox: LngLatBBox, zoom = 11): MapViewState {
  return {
    longitude: (bbox.minLng + bbox.maxLng) / 2,
    latitude: (bbox.minLat + bbox.maxLat) / 2,
    zoom
  };
}

export function boundsFromPoints(points: CoordinateField[]) {
  const lngs = points.map((p) => p.longitude);
  const lats = points.map((p) => p.latitude);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  ] as MapBounds;
}

export function centerFromPoints(points: CoordinateField[], zoom = 11) {
  const longitude = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
  const latitude = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  return { longitude, latitude, zoom };
}

export function coordinateFromLatLng(lat: number, lng: number): CoordinateField {
  return { latitude: lat, longitude: lng };
}
