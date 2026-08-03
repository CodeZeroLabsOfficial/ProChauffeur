"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import { coordinateFromLatLng, hasValidCoordinate } from "@/lib/mapbox/coordinates";
import { dispatchMapMode, resolveDriverLocation } from "@/lib/mapbox/dispatch-map-mode";
import { fetchLiveRouteMetrics } from "@/lib/mapbox/live-route-metrics";
import type { Trip } from "@/lib/models/trip";
import { computeTripProgress, type TripProgress } from "@/lib/trip-progress";

const DEFAULT_DEBOUNCE_MS = 1000;
const MAX_CONCURRENT = 4;

type TripMetricsState = {
  remaining: number | null;
  baseline: number | null;
  error: boolean;
};

function phaseKey(trip: Trip): string {
  return `${trip.id}-${dispatchMapMode(trip.status)}`;
}

function needsLiveMetrics(trip: Trip): boolean {
  const mode = dispatchMapMode(trip.status);
  return mode === "to_pickup" || mode === "to_dropoff";
}

export function useActiveTripsProgress(
  trips: Trip[],
  locations: DriverLiveLocation[],
  token: string,
  enabled: boolean,
  options?: { debounceMs?: number }
): {
  progressByTripId: Map<string, TripProgress>;
  loadingTripIds: Set<string>;
} {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const [metricsByTripId, setMetricsByTripId] = useState<Map<string, TripMetricsState>>(
    () => new Map()
  );
  const [loadingTripIds, setLoadingTripIds] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(() => new Date());
  const baselineByPhase = useRef(new Map<string, number>());
  const hasFetchedOnce = useRef(new Set<string>());
  const locationsRef = useRef(locations);
  locationsRef.current = locations;

  const liveTripSignatures = useMemo(() => {
    return trips
      .filter(needsLiveMetrics)
      .map((trip) => {
        const loc = resolveDriverLocation(trip, locations);
        return `${trip.id}:${trip.status}:${loc ? `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}` : "none"}`;
      })
      .sort()
      .join("|");
  }, [trips, locations]);

  const tripIdsKey = useMemo(
    () =>
      trips
        .map((t) => t.id)
        .sort()
        .join(","),
    [trips]
  );

  useEffect(() => {
    setMetricsByTripId((prev) => {
      const next = new Map(prev);
      const idSet = new Set(trips.map((t) => t.id));
      for (const id of next.keys()) {
        if (!idSet.has(id)) next.delete(id);
      }
      return next;
    });
    for (const key of [...hasFetchedOnce.current]) {
      const tripId = key.split(":")[0];
      if (!trips.some((t) => t.id === tripId)) hasFetchedOnce.current.delete(key);
    }
  }, [tripIdsKey, trips]);

  useEffect(() => {
    if (!enabled || !token) return;

    const candidates = trips.filter((trip) => {
      if (!needsLiveMetrics(trip)) return false;
      const loc = resolveDriverLocation(trip, locationsRef.current);
      if (!loc) return false;
      const from = coordinateFromLatLng(loc.lat, loc.lng);
      const mode = dispatchMapMode(trip.status);
      const to = mode === "to_pickup" ? trip.pickup : trip.dropoff;
      return hasValidCoordinate(from) && hasValidCoordinate(to);
    });

    if (candidates.length === 0) {
      setLoadingTripIds(new Set());
      return;
    }

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadAll() {
      const loading = new Set(candidates.map((t) => t.id));
      setLoadingTripIds(loading);

      const queue = [...candidates];
      const workers: Promise<void>[] = [];

      async function worker() {
        while (queue.length > 0) {
          const trip = queue.shift();
          if (!trip || cancelled) return;
          const loc = resolveDriverLocation(trip, locationsRef.current);
          if (!loc) {
            loading.delete(trip.id);
            continue;
          }
          const from = coordinateFromLatLng(loc.lat, loc.lng);
          const mode = dispatchMapMode(trip.status);
          const to = mode === "to_pickup" ? trip.pickup : trip.dropoff;
          try {
            const metrics = await fetchLiveRouteMetrics(from, to, token);
            if (cancelled) return;
            const key = phaseKey(trip);
            let baseline = baselineByPhase.current.get(key) ?? null;
            if (metrics && baseline == null) {
              baseline = metrics.durationSeconds;
              baselineByPhase.current.set(key, metrics.durationSeconds);
            }
            setMetricsByTripId((prev) => {
              const next = new Map(prev);
              next.set(trip.id, {
                remaining: metrics?.durationSeconds ?? null,
                baseline,
                error: !metrics
              });
              return next;
            });
            hasFetchedOnce.current.add(`${trip.id}:${trip.status}`);
          } catch {
            if (cancelled) return;
            setMetricsByTripId((prev) => {
              const next = new Map(prev);
              next.set(trip.id, {
                remaining: null,
                baseline: baselineByPhase.current.get(phaseKey(trip)) ?? null,
                error: true
              });
              return next;
            });
          } finally {
            loading.delete(trip.id);
            if (!cancelled) setLoadingTripIds(new Set(loading));
          }
        }
      }

      const workerCount = Math.min(MAX_CONCURRENT, queue.length);
      for (let i = 0; i < workerCount; i++) workers.push(worker());
      await Promise.all(workers);
      if (!cancelled) {
        setNow(new Date());
        setLoadingTripIds(new Set());
      }
    }

    const anyFetched = candidates.some((t) =>
      hasFetchedOnce.current.has(`${t.id}:${t.status}`)
    );

    if (debounceMs > 0 && anyFetched) {
      debounceTimer = setTimeout(() => {
        void loadAll();
      }, debounceMs);
    } else {
      void loadAll();
    }

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [enabled, token, liveTripSignatures, debounceMs, trips]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const progressByTripId = useMemo(() => {
    const map = new Map<string, TripProgress>();
    for (const trip of trips) {
      const metrics = metricsByTripId.get(trip.id);
      const live = needsLiveMetrics(trip);
      map.set(
        trip.id,
        computeTripProgress({
          trip,
          remainingDurationSeconds: live ? (metrics?.remaining ?? null) : null,
          baselineDurationSeconds: live ? (metrics?.baseline ?? null) : null,
          now
        })
      );
    }
    return map;
  }, [trips, metricsByTripId, now]);

  return { progressByTripId, loadingTripIds };
}
