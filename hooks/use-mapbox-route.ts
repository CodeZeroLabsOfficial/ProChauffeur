"use client";

import { useEffect, useRef, useState } from "react";

import { fetchMapboxDrivingRoute, type RouteFeature } from "@/lib/mapbox/directions";
import { hasValidCoordinate } from "@/lib/mapbox/coordinates";
import type { CoordinateField } from "@/lib/models/trip";

export function useMapboxRoute(
  from: CoordinateField | null,
  to: CoordinateField | null,
  token: string,
  enabled: boolean,
  options?: { debounceMs?: number; resetKey?: string }
) {
  const [route, setRoute] = useState<RouteFeature | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const debounceMs = options?.debounceMs ?? 0;
  const resetKey = options?.resetKey ?? "";
  const fromLat = from?.latitude ?? 0;
  const fromLng = from?.longitude ?? 0;
  const toLat = to?.latitude ?? 0;
  const toLng = to?.longitude ?? 0;
  const hasFetchedOnce = useRef(false);

  useEffect(() => {
    hasFetchedOnce.current = false;
  }, [resetKey]);

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7828/ingest/5d13c92e-444f-4436-80ad-efa5547b25d2", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "690ad9" },
      body: JSON.stringify({
        sessionId: "690ad9",
        location: "use-mapbox-route.ts:effect",
        message: "route effect",
        data: {
          resetKey,
          enabled,
          fromLat,
          fromLng,
          toLat,
          toLng,
          fromValid: from ? hasValidCoordinate(from) : false,
          toValid: to ? hasValidCoordinate(to) : false
        },
        timestamp: Date.now(),
        hypothesisId: "C"
      })
    }).catch(() => {});
    // #endregion

    if (!enabled || !token || !from || !to) {
      setRoute(null);
      setLoading(false);
      setError(false);
      return;
    }

    if (!hasValidCoordinate(from) || !hasValidCoordinate(to)) {
      setRoute(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    async function loadRoute() {
      setLoading(true);
      setError(false);

      try {
        const result = await fetchMapboxDrivingRoute(from!, to!, token);
        if (cancelled) return;
        if (!result) {
          setRoute(null);
          setError(true);
        } else {
          setRoute(result);
        }
      } catch {
        if (!cancelled) {
          setRoute(null);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const run = () => {
      void loadRoute();
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
  }, [enabled, token, fromLat, fromLng, toLat, toLng, debounceMs, resetKey]);

  return { route, loading, error };
}
