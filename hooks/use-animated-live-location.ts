"use client";

import { useEffect, useRef, useState } from "react";

import type { DriverLiveLocation } from "@/hooks/use-live-locations";

const MIN_ANIMATION_MS = 1000;
const MAX_ANIMATION_MS = 5000;
const DEFAULT_INTERVAL_MS = 3000;
const MIN_MOVE_METERS = 2;
const MAX_SPEED_MPS = 40;
const MIN_COAST_SPEED_MPS = 0.4;
const HARD_CORRECT_METERS = 80;
const COAST_BUDGET_FACTOR = 1.75;
const COAST_DECAY_MS = 2000;

export interface AnimatedLiveLocation {
  lat: number;
  lng: number;
  heading: number | null;
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

function bearingDegrees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function projectPoint(
  lat: number,
  lng: number,
  bearingDeg: number,
  distanceM: number
): { lat: number; lng: number } {
  const R = 6371000;
  const δ = distanceM / R;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lng * Math.PI) / 180;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const φ2 = Math.asin(sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ));
  const λ2 =
    λ1 +
    Math.atan2(Math.sin(θ) * sinδ * cosφ1, cosδ - sinφ1 * Math.sin(φ2));
  return {
    lat: (φ2 * 180) / Math.PI,
    lng: (((λ2 * 180) / Math.PI + 540) % 360) - 180
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return a + delta * t;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

type FixSample = {
  lat: number;
  lng: number;
  heading: number | null;
  updatedAt: number;
};

type Velocity = {
  speedMps: number;
  bearingDeg: number;
};

type LerpAnim = {
  fromLat: number;
  fromLng: number;
  fromHeading: number | null;
  toLat: number;
  toLng: number;
  toHeading: number | null;
  startMs: number;
  durationMs: number;
};

/**
 * Smoothly interpolates between successive RTDB live-location fixes and coasts
 * with estimated velocity until the next sample arrives.
 */
export function useAnimatedLiveLocation(
  location: DriverLiveLocation | null
): AnimatedLiveLocation | null {
  const [display, setDisplay] = useState<AnimatedLiveLocation | null>(() =>
    location
      ? { lat: location.lat, lng: location.lng, heading: location.heading }
      : null
  );

  const displayRef = useRef(display);
  const rafRef = useRef<number | null>(null);
  const lastTickMsRef = useRef(0);
  const prevFixRef = useRef<FixSample | null>(null);
  const lastReceivedAtRef = useRef(0);
  const lastIntervalMsRef = useRef(DEFAULT_INTERVAL_MS);
  const velocityRef = useRef<Velocity | null>(null);
  const lerpRef = useRef<LerpAnim | null>(null);
  const driverIdRef = useRef<string | null>(location?.driverId ?? null);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    const stopRaf = () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const tick = (now: number) => {
      const prevTick = lastTickMsRef.current || now;
      const dtSec = clamp((now - prevTick) / 1000, 0, 0.1);
      lastTickMsRef.current = now;

      const lerpAnim = lerpRef.current;
      let next: AnimatedLiveLocation | null = displayRef.current;

      if (lerpAnim) {
        const t = clamp((now - lerpAnim.startMs) / lerpAnim.durationMs, 0, 1);
        next = {
          lat: lerp(lerpAnim.fromLat, lerpAnim.toLat, t),
          lng: lerp(lerpAnim.fromLng, lerpAnim.toLng, t),
          heading:
            lerpAnim.fromHeading != null && lerpAnim.toHeading != null
              ? lerpAngle(lerpAnim.fromHeading, lerpAnim.toHeading, t)
              : (lerpAnim.toHeading ?? lerpAnim.fromHeading)
        };

        if (t >= 1) {
          lerpRef.current = null;
        }
      } else {
        const velocity = velocityRef.current;
        const current = displayRef.current;
        if (velocity && current && velocity.speedMps >= MIN_COAST_SPEED_MPS) {
          const sinceFixMs = now - lastReceivedAtRef.current;
          const coastBudgetMs = lastIntervalMsRef.current * COAST_BUDGET_FACTOR;
          let speed = velocity.speedMps;
          if (sinceFixMs > coastBudgetMs) {
            const decayT = clamp(
              (sinceFixMs - coastBudgetMs) / COAST_DECAY_MS,
              0,
              1
            );
            speed *= 1 - decayT;
          }

          if (speed >= MIN_COAST_SPEED_MPS) {
            const projected = projectPoint(
              current.lat,
              current.lng,
              velocity.bearingDeg,
              speed * dtSec
            );
            next = {
              lat: projected.lat,
              lng: projected.lng,
              heading: velocity.bearingDeg
            };
          } else {
            velocityRef.current = null;
          }
        }
      }

      if (next) {
        displayRef.current = next;
        setDisplay(next);
      }

      const stillMoving =
        lerpRef.current != null ||
        (velocityRef.current != null &&
          velocityRef.current.speedMps >= MIN_COAST_SPEED_MPS);
      if (stillMoving) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    const ensureRaf = () => {
      if (rafRef.current == null) {
        lastTickMsRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    if (!location) {
      stopRaf();
      lerpRef.current = null;
      velocityRef.current = null;
      prevFixRef.current = null;
      lastReceivedAtRef.current = 0;
      driverIdRef.current = null;
      setDisplay(null);
      return;
    }

    const now = performance.now();
    const driverChanged = driverIdRef.current !== location.driverId;
    if (driverChanged) {
      driverIdRef.current = location.driverId;
      prevFixRef.current = null;
      velocityRef.current = null;
      lerpRef.current = null;
      lastReceivedAtRef.current = 0;
    }

    const sample: FixSample = {
      lat: location.lat,
      lng: location.lng,
      heading: location.heading,
      updatedAt: location.updatedAt
    };

    const current = displayRef.current;
    if (!current || driverChanged) {
      const initial = {
        lat: location.lat,
        lng: location.lng,
        heading: location.heading
      };
      displayRef.current = initial;
      setDisplay(initial);
      prevFixRef.current = sample;
      lastReceivedAtRef.current = now;
      return;
    }

    const prevFix = prevFixRef.current;
    let intervalMs = DEFAULT_INTERVAL_MS;
    if (prevFix && location.updatedAt > prevFix.updatedAt) {
      intervalMs = location.updatedAt - prevFix.updatedAt;
    } else if (lastReceivedAtRef.current > 0) {
      intervalMs = now - lastReceivedAtRef.current;
    }
    intervalMs = clamp(intervalMs, MIN_ANIMATION_MS, MAX_ANIMATION_MS);
    lastIntervalMsRef.current = intervalMs;

    if (prevFix) {
      const segmentM = haversineMeters(
        prevFix.lat,
        prevFix.lng,
        location.lat,
        location.lng
      );
      if (segmentM >= MIN_MOVE_METERS) {
        const dtSec = Math.max(
          0.001,
          prevFix.updatedAt > 0 && location.updatedAt > prevFix.updatedAt
            ? (location.updatedAt - prevFix.updatedAt) / 1000
            : intervalMs / 1000
        );
        const speedMps = clamp(segmentM / dtSec, 0, MAX_SPEED_MPS);
        const bearingDeg =
          location.heading ??
          bearingDegrees(prevFix.lat, prevFix.lng, location.lat, location.lng);
        velocityRef.current = { speedMps, bearingDeg };
      } else {
        velocityRef.current = null;
      }
    }

    const errorM = haversineMeters(
      current.lat,
      current.lng,
      location.lat,
      location.lng
    );

    prevFixRef.current = sample;
    lastReceivedAtRef.current = now;

    if (errorM < MIN_MOVE_METERS) {
      const snapped = {
        lat: location.lat,
        lng: location.lng,
        heading: location.heading ?? current.heading
      };
      displayRef.current = snapped;
      setDisplay(snapped);
      lerpRef.current = null;
      return;
    }

    const durationMs =
      errorM > HARD_CORRECT_METERS
        ? Math.min(intervalMs, MIN_ANIMATION_MS)
        : intervalMs;

    const toHeading =
      location.heading ??
      velocityRef.current?.bearingDeg ??
      bearingDegrees(current.lat, current.lng, location.lat, location.lng);

    lerpRef.current = {
      fromLat: current.lat,
      fromLng: current.lng,
      fromHeading: current.heading,
      toLat: location.lat,
      toLng: location.lng,
      toHeading,
      startMs: now,
      durationMs
    };

    ensureRaf();

    return () => {
      stopRaf();
    };
  }, [
    location?.lat,
    location?.lng,
    location?.heading,
    location?.updatedAt,
    location?.driverId
  ]);

  return display;
}
