"use client";

import { useEffect, useRef, useState } from "react";

import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import { coordinateFromLatLng, hasValidCoordinate } from "@/lib/mapbox/coordinates";
import { dispatchMapMode } from "@/lib/mapbox/dispatch-map-mode";
import { fetchLiveRouteMetrics } from "@/lib/mapbox/live-route-metrics";
import type { Trip } from "@/lib/models/trip";
import {
  computeTripProgress,
  IDLE_TRIP_PROGRESS,
  type TripProgress
} from "@/lib/trip-progress";

const DEFAULT_DEBOUNCE_MS = 1000;

function phaseKey(trip: Trip): string {
  return `${trip.id}-${dispatchMapMode(trip.status)}`;
}

export function useTripRouteMetrics(
  trip: Trip | null,
  driverLocation: DriverLiveLocation | null,
  token: string,
  enabled: boolean,
  options?: { debounceMs?: number }
): {
  progress: TripProgress;
  remainingDurationSeconds: number | null;
  baselineDurationSeconds: number | null;
  loading: boolean;
  error: boolean;
} {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const [remaining, setRemaining] = useState<number | null>(null);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const hasFetchedOnce = useRef(false);
  const baselineByPhase = useRef(new Map<string, number>());
  const lastPhase = useRef<string | null>(null);

  const mode = trip ? dispatchMapMode(trip.status) : "overview";
  const needsLive = mode === "to_pickup" || mode === "to_dropoff";
  const from = driverLocation
    ? coordinateFromLatLng(driverLocation.lat, driverLocation.lng)
    : null;
  const to =
    trip && mode === "to_pickup"
      ? trip.pickup
      : trip && mode === "to_dropoff"
        ? trip.dropoff
        : null;

  const fromLat = from?.latitude ?? 0;
  const fromLng = from?.longitude ?? 0;
  const toLat = to?.latitude ?? 0;
  const toLng = to?.longitude ?? 0;
  const tripId = trip?.id ?? "";
  const status = trip?.status ?? "";

  useEffect(() => {
    hasFetchedOnce.current = false;
    setRemaining(null);
    setError(false);
    const key = trip ? phaseKey(trip) : null;
    if (key !== lastPhase.current) {
      lastPhase.current = key;
      setBaseline(key ? (baselineByPhase.current.get(key) ?? null) : null);
    }
  }, [tripId, status]);

  useEffect(() => {
    if (!enabled || !token || !trip || !needsLive || !from || !to) {
      setLoading(false);
      if (!needsLive) {
        setRemaining(null);
        setError(false);
      }
      return;
    }

    if (!hasValidCoordinate(from) || !hasValidCoordinate(to)) {
      setRemaining(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const metrics = await fetchLiveRouteMetrics(from!, to!, token);
        if (cancelled) return;
        if (!metrics) {
          setError(true);
          return;
        }
        setRemaining(metrics.durationSeconds);
        setNow(new Date());
        const key = phaseKey(trip!);
        if (!baselineByPhase.current.has(key)) {
          baselineByPhase.current.set(key, metrics.durationSeconds);
          setBaseline(metrics.durationSeconds);
        } else {
          setBaseline(baselineByPhase.current.get(key) ?? null);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const run = () => {
      void load();
    };

    if (debounceMs > 0 && hasFetchedOnce.current) {
      debounceTimer = setTimeout(run, debounceMs);
    } else {
      run();
      hasFetchedOnce.current = true;
    }

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [
    enabled,
    token,
    needsLive,
    tripId,
    status,
    fromLat,
    fromLng,
    toLat,
    toLng,
    debounceMs
  ]);

  useEffect(() => {
    if (!needsLive || remaining == null) return;
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, [needsLive, remaining]);

  const progress = trip
    ? computeTripProgress({
        trip,
        remainingDurationSeconds: needsLive ? remaining : null,
        baselineDurationSeconds: needsLive ? baseline : null,
        now
      })
    : IDLE_TRIP_PROGRESS;

  return {
    progress,
    remainingDurationSeconds: remaining,
    baselineDurationSeconds: baseline,
    loading,
    error
  };
}
