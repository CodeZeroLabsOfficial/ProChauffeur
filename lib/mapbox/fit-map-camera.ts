import type { MapRef } from "react-map-gl/mapbox";

import {
  centerFromBBox,
  mapBoundsFromBBox,
  type LngLatBBox,
  type MapViewState
} from "@/lib/mapbox/coordinates";

export const DISPATCH_MAP_FIT = {
  padding: 64,
  maxZoom: 15,
  durationMs: 700,
  throttleMs: 1500,
  singlePointZoom: 13
} as const;

/** Fly / fit the map camera to a bbox, or the fallback view when empty. */
export function applyMapCameraFit(
  map: MapRef,
  bbox: LngLatBBox | null,
  fallback: MapViewState,
  options?: {
    padding?: number;
    maxZoom?: number;
    durationMs?: number;
    singlePointZoom?: number;
  }
) {
  const duration = options?.durationMs ?? DISPATCH_MAP_FIT.durationMs;
  const padding = options?.padding ?? DISPATCH_MAP_FIT.padding;
  const maxZoom = options?.maxZoom ?? DISPATCH_MAP_FIT.maxZoom;
  const singlePointZoom = options?.singlePointZoom ?? DISPATCH_MAP_FIT.singlePointZoom;

  if (!bbox || bbox.count === 0) {
    map.flyTo({
      center: [fallback.longitude, fallback.latitude],
      zoom: fallback.zoom,
      duration
    });
    return;
  }

  if (bbox.count === 1) {
    map.flyTo({
      center: [bbox.minLng, bbox.minLat],
      zoom: singlePointZoom,
      duration
    });
    return;
  }

  map.fitBounds(mapBoundsFromBBox(bbox), {
    padding,
    maxZoom,
    duration
  });
}

export function initialViewFromBBox(
  bbox: LngLatBBox | null,
  fallback: MapViewState
): MapViewState {
  if (!bbox || bbox.count === 0) return fallback;
  return centerFromBBox(bbox);
}
