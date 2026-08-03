"use client";

import { useEffect, useRef } from "react";
import type { MapRef } from "react-map-gl/mapbox";

import { haversineMeters } from "@/lib/geo/haversine";
import type { LngLatBBox, MapViewState } from "@/lib/mapbox/coordinates";
import {
  applyLiveTripCameraFit,
  createLiveTripCameraController,
  LIVE_TRIP_CAMERA,
  nextLiveTripFramingMode,
  recordLiveTripCameraUpdate,
  shouldUpdateLiveTripCamera,
  type LiveTripCameraController
} from "@/lib/mapbox/live-trip-camera";

/**
 * Live driver→destination camera: overview → approach → follow as separation
 * shrinks. Throttles refits so GPS churn does not constantly re-animate.
 */
export function useLiveTripMapFit({
  map,
  enabled,
  bbox,
  driverLat,
  driverLng,
  destLat,
  destLng,
  hasRoute,
  fallbackView,
  resetKey = "",
  flushKey = ""
}: {
  map: MapRef | null;
  enabled: boolean;
  bbox: LngLatBBox | null;
  driverLat: number | null;
  driverLng: number | null;
  destLat: number | null;
  destLng: number | null;
  hasRoute: boolean;
  fallbackView: MapViewState;
  resetKey?: string;
  flushKey?: string;
}) {
  const controllerRef = useRef<LiveTripCameraController>(createLiveTripCameraController());
  const resetKeyRef = useRef(resetKey);
  const hadFlushRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!map || !enabled) return;
    if (driverLat == null || driverLng == null || destLat == null || destLng == null) return;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const resetChanged = resetKeyRef.current !== resetKey;
    if (resetChanged) {
      resetKeyRef.current = resetKey;
      controllerRef.current = createLiveTripCameraController();
      hadFlushRef.current = false;
    }

    const flushActive = flushKey.length > 0;
    if (!flushActive) {
      hadFlushRef.current = false;
    }
    const flushJustArrived = flushActive && !hadFlushRef.current;
    if (flushActive) hadFlushRef.current = true;

    const force = resetChanged || flushJustArrived || controllerRef.current.lastUpdateAt === 0;
    const sepM = haversineMeters(driverLat, driverLng, destLat, destLng);
    const now = Date.now();
    const controller = controllerRef.current;

    if (
      !shouldUpdateLiveTripCamera(controller, driverLat, driverLng, sepM, hasRoute, now, force)
    ) {
      return;
    }

    const applyFit = () => {
      const at = Date.now();
      const current = controllerRef.current;
      const separation = haversineMeters(driverLat, driverLng, destLat, destLng);
      const framingMode = nextLiveTripFramingMode(current.framingMode, separation);
      applyLiveTripCameraFit(
        map,
        framingMode,
        bbox,
        driverLng,
        driverLat,
        destLng,
        destLat,
        fallbackView
      );
      recordLiveTripCameraUpdate(
        current,
        driverLat,
        driverLng,
        separation,
        framingMode,
        hasRoute,
        at
      );
    };

    if (force) {
      clearTimer();
      applyFit();
      return () => clearTimer();
    }

    const elapsed = now - controller.lastUpdateAt;
    const wait = Math.max(0, LIVE_TRIP_CAMERA.minCameraIntervalMs - elapsed);
    if (wait === 0) {
      clearTimer();
      applyFit();
      return () => clearTimer();
    }

    clearTimer();
    timerRef.current = setTimeout(applyFit, wait);
    return () => clearTimer();
  }, [
    map,
    enabled,
    bbox?.minLng,
    bbox?.minLat,
    bbox?.maxLng,
    bbox?.maxLat,
    bbox?.count,
    driverLat,
    driverLng,
    destLat,
    destLng,
    hasRoute,
    fallbackView.longitude,
    fallbackView.latitude,
    fallbackView.zoom,
    resetKey,
    flushKey
  ]);
}
