"use client";

import { useEffect, useRef, useState } from "react";

import type { LiveLocation } from "@/hooks/use-live-locations";

const MIN_ANIMATION_MS = 500;
const MAX_ANIMATION_MS = 5000;
const MIN_MOVE_METERS = 2;

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

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let delta = ((b - a + 540) % 360) - 180;
  return a + delta * t;
}

/**
 * Smoothly interpolates between successive RTDB live-location fixes for map markers.
 */
export function useAnimatedLiveLocation(
  location: LiveLocation | null
): AnimatedLiveLocation | null {
  const [display, setDisplay] = useState<AnimatedLiveLocation | null>(() =>
    location
      ? { lat: location.lat, lng: location.lng, heading: location.heading }
      : null
  );

  const displayRef = useRef(display);
  const rafRef = useRef<number | null>(null);
  const animRef = useRef<{
    fromLat: number;
    fromLng: number;
    fromHeading: number | null;
    toLat: number;
    toLng: number;
    toHeading: number | null;
    startMs: number;
    durationMs: number;
  } | null>(null);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (!location) {
      animRef.current = null;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDisplay(null);
      return;
    }

    const current = displayRef.current;
    if (!current) {
      setDisplay({
        lat: location.lat,
        lng: location.lng,
        heading: location.heading
      });
      return;
    }

    const moved = haversineMeters(current.lat, current.lng, location.lat, location.lng);
    if (moved < MIN_MOVE_METERS) {
      setDisplay({
        lat: location.lat,
        lng: location.lng,
        heading: location.heading ?? current.heading
      });
      return;
    }

    const gapMs = Math.min(
      MAX_ANIMATION_MS,
      Math.max(MIN_ANIMATION_MS, Date.now() - location.updatedAt)
    );

    animRef.current = {
      fromLat: current.lat,
      fromLng: current.lng,
      fromHeading: current.heading,
      toLat: location.lat,
      toLng: location.lng,
      toHeading: location.heading,
      startMs: performance.now(),
      durationMs: gapMs
    };

    const tick = (now: number) => {
      const anim = animRef.current;
      if (!anim) return;

      const rawT = (now - anim.startMs) / anim.durationMs;
      const t = Math.min(1, rawT);
      const eased = 1 - (1 - t) ** 2;

      const next: AnimatedLiveLocation = {
        lat: lerp(anim.fromLat, anim.toLat, eased),
        lng: lerp(anim.fromLng, anim.toLng, eased),
        heading:
          anim.fromHeading != null && anim.toHeading != null
            ? lerpAngle(anim.fromHeading, anim.toHeading, eased)
            : anim.toHeading ?? anim.fromHeading
      };

      setDisplay(next);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        animRef.current = null;
      }
    };

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [location?.lat, location?.lng, location?.heading, location?.updatedAt, location?.driverId]);

  return display;
}
