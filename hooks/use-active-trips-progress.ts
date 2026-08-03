"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import { coordinateFromLatLng, hasValidCoordinate } from "@/lib/mapbox/coordinates";
import { dispatchMapMode, resolveDriverLocation } from "@/lib/mapbox/dispatch-map-mode";
import { fetchLiveRouteMetrics } from "@/lib/mapbox/live-route-metrics";
import type { Trip } from "@/lib/models/trip";
import { computeTripProgress, type TripProgress } from "@/lib/trip-progress";

const DEBOUNCE_MS = 1000;
const MAX_CONCURRENT = 4;

type TripMetricsState = {
  remaining: number | null;
  baseline: number | null;
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
  enabled: boolean
): { progressByTripId: Map<string, TripProgress> } {
  const [metricsByTripId, setMetricsByTripId] = useState<Map<string, TripMetricsState>>(
    () => new Map()
  );
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
      if (!trips.some((t) => key.startsWith(`${t.id}:`))) {
        hasFetchedOnce.current.delete(key);
      }
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
      const to = mode === "to_pickup" ? trip.journey.pickup : trip.journey.dropoff;
      return hasValidCoordinate(from) && hasValidCoordinate(to);
    });

    if (candidates.length === 0) return;

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadAll() {
      const queue = [...candidates];
      const updates = new Map<string, TripMetricsState>();

      async function worker() {
        while (queue.length > 0) {
          const trip = queue.shift();
          if (!trip || cancelled) return;
          const loc = resolveDriverLocation(trip, locationsRef.current);
          if (!loc) continue;
          const from = coordinateFromLatLng(loc.lat, loc.lng);
          const mode = dispatchMapMode(trip.status);
          const to = mode === "to_pickup" ? trip.journey.pickup : trip.journey.dropoff;
          try {
            const metrics = await fetchLiveRouteMetrics(from, to, token);
            if (cancelled) return;
            const key = phaseKey(trip);
            let baseline = baselineByPhase.current.get(key) ?? null;
            if (metrics && baseline == null) {
              baseline = metrics.durationSeconds;
              baselineByPhase.current.set(key, metrics.durationSeconds);
            }
            updates.set(trip.id, {
              remaining: metrics?.durationSeconds ?? null,
              baseline
            });
            hasFetchedOnce.current.add(`${trip.id}:${trip.status}`);
          } catch {
            if (cancelled) return;
            updates.set(trip.id, {
              remaining: null,
              baseline: baselineByPhase.current.get(phaseKey(trip)) ?? null
            });
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(MAX_CONCURRENT, queue.length) }, () => worker())
      );

      if (cancelled || updates.size === 0) return;
      setMetricsByTripId((prev) => {
        const next = new Map(prev);
        for (const [id, state] of updates) next.set(id, state);
        return next;
      });
      setNow(new Date());
    }

    const anyFetched = candidates.some((t) =>
      hasFetchedOnce.current.has(`${t.id}:${t.status}`)
    );

    if (anyFetched) {
      debounceTimer = setTimeout(() => {
        void loadAll();
      }, DEBOUNCE_MS);
    } else {
      void loadAll();
    }

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [enabled, token, liveTripSignatures, trips]);

  useEffect(() => {
    const hasLive = trips.some(needsLiveMetrics);
    if (!hasLive) return;
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, [trips]);

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

  return { progressByTripId };
}
