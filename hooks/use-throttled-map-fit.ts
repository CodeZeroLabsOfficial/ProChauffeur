"use client";

import { useEffect, useRef } from "react";
import type { MapRef } from "react-map-gl/mapbox";

import type { LngLatBBox, MapViewState } from "@/lib/mapbox/coordinates";
import { applyMapCameraFit, DISPATCH_MAP_FIT } from "@/lib/mapbox/fit-map-camera";

/**
 * Fits the map to `bbox`, throttling while `throttle` is true so live GPS
 * updates do not constantly re-animate. `resetKey` / `flushKey` force an
 * immediate fit (trip/mode change, first route arrival, etc.).
 *
 * When `freezeAfterFit` is set, further bbox changes are ignored after the
 * initial / reset / flush fit so live driver motion does not re-frame the map.
 */
export function useThrottledMapFit({
  map,
  bbox,
  fallbackView,
  throttle = false,
  throttleMs = DISPATCH_MAP_FIT.throttleMs,
  freezeAfterFit = false,
  resetKey = "",
  flushKey = ""
}: {
  map: MapRef | null;
  bbox: LngLatBBox | null;
  fallbackView: MapViewState;
  throttle?: boolean;
  throttleMs?: number;
  freezeAfterFit?: boolean;
  resetKey?: string;
  /** When this becomes non-empty, fit immediately (e.g. route geometry arrived). */
  flushKey?: string;
}) {
  const lastFitAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetKeyRef = useRef(resetKey);
  const hadFlushRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const applyFit = () => {
      lastFitAtRef.current = Date.now();
      applyMapCameraFit(map, bbox, fallbackView);
    };

    const resetChanged = resetKeyRef.current !== resetKey;
    if (resetChanged) {
      resetKeyRef.current = resetKey;
      lastFitAtRef.current = 0;
      hadFlushRef.current = false;
    }

    const flushActive = flushKey.length > 0;
    if (!flushActive) {
      hadFlushRef.current = false;
    }
    const flushJustArrived = flushActive && !hadFlushRef.current;
    if (flushActive) hadFlushRef.current = true;

    const forceFit =
      !throttle || resetChanged || lastFitAtRef.current === 0 || flushJustArrived;

    if (forceFit) {
      clearTimer();
      applyFit();
      return;
    }

    if (freezeAfterFit) {
      clearTimer();
      return;
    }

    const elapsed = Date.now() - lastFitAtRef.current;
    if (elapsed >= throttleMs) {
      applyFit();
      return;
    }

    clearTimer();
    timerRef.current = setTimeout(applyFit, throttleMs - elapsed);

    return () => {
      clearTimer();
    };
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
    throttle,
    throttleMs,
    freezeAfterFit,
    resetKey,
    flushKey
  ]);
}
