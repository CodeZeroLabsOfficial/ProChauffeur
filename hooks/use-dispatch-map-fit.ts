"use client";

import { useEffect, useRef } from "react";
import type { MapRef } from "react-map-gl/mapbox";

import type { LngLatBBox, MapViewState } from "@/lib/mapbox/coordinates";
import { applyMapCameraFit } from "@/lib/mapbox/fit-map-camera";

/**
 * Fits the map to `bbox`.
 *
 * - `once: false` — refit whenever the bbox changes
 * - `once: true` — fit on first paint / `resetKey` / `flushKey` only
 */
export function useDispatchMapFit({
  map,
  bbox,
  fallbackView,
  once = false,
  resetKey = "",
  flushKey = ""
}: {
  map: MapRef | null;
  bbox: LngLatBBox | null;
  fallbackView: MapViewState;
  once?: boolean;
  resetKey?: string;
  /** When this becomes non-empty, fit immediately (e.g. route geometry arrived). */
  flushKey?: string;
}) {
  const fittedRef = useRef(false);
  const resetKeyRef = useRef(resetKey);
  const hadFlushRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    const resetChanged = resetKeyRef.current !== resetKey;
    if (resetChanged) {
      resetKeyRef.current = resetKey;
      fittedRef.current = false;
      hadFlushRef.current = false;
    }

    const flushActive = flushKey.length > 0;
    if (!flushActive) {
      hadFlushRef.current = false;
    }
    const flushJustArrived = flushActive && !hadFlushRef.current;
    if (flushActive) hadFlushRef.current = true;

    if (once && fittedRef.current && !resetChanged && !flushJustArrived) {
      return;
    }

    applyMapCameraFit(map, bbox, fallbackView);
    fittedRef.current = true;
  }, [
    map,
    bbox?.minLng,
    bbox?.minLat,
    bbox?.maxLng,
    bbox?.maxLat,
    bbox?.count,
    fallbackView.longitude,
    fallbackView.latitude,
    fallbackView.zoom,
    once,
    resetKey,
    flushKey
  ]);
}
