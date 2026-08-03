import type { MapRef } from "react-map-gl/mapbox";

import { haversineMeters } from "@/lib/geo/haversine";
import {
  mapBoundsFromBBox,
  type LngLatBBox,
  type MapViewState
} from "@/lib/mapbox/coordinates";
import { DISPATCH_MAP_FIT } from "@/lib/mapbox/fit-map-camera";

/** Distance-based framing for live driver → destination tracking. */
export type LiveTripFramingMode = "overview" | "approach" | "follow";

export const LIVE_TRIP_CAMERA = {
  overviewEnterMeters: 2_200,
  overviewExitMeters: 1_800,
  followEnterMeters: 450,
  followExitMeters: 550,
  minCameraIntervalMs: 2_500,
  minSepChangeMeters: 250,
  minSepChangeRatio: 0.05,
  minDriverMoveMeters: 150,
  overviewMaxZoom: 14,
  approachMaxZoom: 15.5,
  followZoom: 15.5,
  followCenterFraction: 0.35,
  padding: DISPATCH_MAP_FIT.padding,
  durationMs: DISPATCH_MAP_FIT.durationMs
} as const;

export type LiveTripCameraController = {
  framingMode: LiveTripFramingMode;
  lastUpdateAt: number;
  lastDriverLat: number | null;
  lastDriverLng: number | null;
  lastSepM: number | null;
  lastHadRoute: boolean;
};

export function createLiveTripCameraController(): LiveTripCameraController {
  return {
    framingMode: "overview",
    lastUpdateAt: 0,
    lastDriverLat: null,
    lastDriverLng: null,
    lastSepM: null,
    lastHadRoute: false
  };
}

export function nextLiveTripFramingMode(
  current: LiveTripFramingMode,
  sepM: number
): LiveTripFramingMode {
  switch (current) {
    case "overview":
      if (sepM < LIVE_TRIP_CAMERA.followEnterMeters) return "follow";
      if (sepM < LIVE_TRIP_CAMERA.overviewExitMeters) return "approach";
      return "overview";
    case "approach":
      if (sepM < LIVE_TRIP_CAMERA.followEnterMeters) return "follow";
      if (sepM > LIVE_TRIP_CAMERA.overviewEnterMeters) return "overview";
      return "approach";
    case "follow":
      if (sepM > LIVE_TRIP_CAMERA.followExitMeters) {
        return sepM > LIVE_TRIP_CAMERA.overviewEnterMeters ? "overview" : "approach";
      }
      return "follow";
  }
}

export function maxZoomForLiveFraming(mode: LiveTripFramingMode): number {
  return mode === "overview"
    ? LIVE_TRIP_CAMERA.overviewMaxZoom
    : LIVE_TRIP_CAMERA.approachMaxZoom;
}

/** Linear interpolate between two WGS84 points (fine for short spans). */
export function interpolateLngLat(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  fraction: number
): [number, number] {
  const t = Math.min(1, Math.max(0, fraction));
  return [fromLng + (toLng - fromLng) * t, fromLat + (toLat - fromLat) * t];
}

export function shouldUpdateLiveTripCamera(
  controller: LiveTripCameraController,
  driverLat: number,
  driverLng: number,
  sepM: number,
  hasRoute: boolean,
  now: number,
  force: boolean
): boolean {
  if (force) return true;
  if (controller.lastUpdateAt === 0) return true;
  if (hasRoute && !controller.lastHadRoute) return true;

  if (now - controller.lastUpdateAt >= LIVE_TRIP_CAMERA.minCameraIntervalMs) return true;

  if (
    controller.lastSepM != null &&
    Math.abs(sepM - controller.lastSepM) >=
      Math.max(
        LIVE_TRIP_CAMERA.minSepChangeMeters,
        controller.lastSepM * LIVE_TRIP_CAMERA.minSepChangeRatio
      )
  ) {
    return true;
  }

  if (
    controller.lastDriverLat != null &&
    controller.lastDriverLng != null &&
    haversineMeters(
      controller.lastDriverLat,
      controller.lastDriverLng,
      driverLat,
      driverLng
    ) >= LIVE_TRIP_CAMERA.minDriverMoveMeters
  ) {
    return true;
  }

  return false;
}

export function recordLiveTripCameraUpdate(
  controller: LiveTripCameraController,
  driverLat: number,
  driverLng: number,
  sepM: number,
  framingMode: LiveTripFramingMode,
  hasRoute: boolean,
  now: number
): void {
  controller.lastUpdateAt = now;
  controller.lastDriverLat = driverLat;
  controller.lastDriverLng = driverLng;
  controller.lastSepM = sepM;
  controller.framingMode = framingMode;
  controller.lastHadRoute = hasRoute;
}

/** Apply overview / approach fitBounds or near-arrival follow flyTo. */
export function applyLiveTripCameraFit(
  map: MapRef,
  framingMode: LiveTripFramingMode,
  bbox: LngLatBBox | null,
  driverLng: number,
  driverLat: number,
  destLng: number,
  destLat: number,
  fallback: MapViewState
): void {
  const duration = LIVE_TRIP_CAMERA.durationMs;
  const padding = LIVE_TRIP_CAMERA.padding;

  if (framingMode === "follow") {
    const center = interpolateLngLat(
      driverLng,
      driverLat,
      destLng,
      destLat,
      LIVE_TRIP_CAMERA.followCenterFraction
    );
    map.flyTo({
      center,
      zoom: LIVE_TRIP_CAMERA.followZoom,
      duration
    });
    return;
  }

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
      zoom: LIVE_TRIP_CAMERA.followZoom,
      duration
    });
    return;
  }

  map.fitBounds(mapBoundsFromBBox(bbox), {
    padding,
    maxZoom: maxZoomForLiveFraming(framingMode),
    duration
  });
}
