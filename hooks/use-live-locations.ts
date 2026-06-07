"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { realtimeDb } from "@/lib/firebase/client";
import { rtdbLiveLocationsPath } from "@/lib/models";

/**
 * One live driver/vehicle position from RTDB `liveLocations/{driverId}`.
 *
 * Contract shared with the iOS driver app (which dual-writes GPS here):
 * `{ lat, lng, heading?, status?, tripId?, updatedAt }`.
 */
export interface LiveLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading: number | null;
  status: string | null;
  tripId: string | null;
  updatedAt: number;
}

/**
 * Subscribes to all live driver positions in Realtime Database.
 * Returns an empty array until data arrives (or when RTDB is unreachable).
 */
export function useLiveLocations(): { locations: LiveLocation[]; ready: boolean } {
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    try {
      const node = ref(realtimeDb(), rtdbLiveLocationsPath);
      // #region agent log
      fetch("http://127.0.0.1:7828/ingest/5d13c92e-444f-4436-80ad-efa5547b25d2", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "de9315" },
        body: JSON.stringify({
          sessionId: "de9315",
          location: "use-live-locations.ts:subscribe",
          message: "RTDB listener attaching",
          data: { path: rtdbLiveLocationsPath },
          timestamp: Date.now(),
          hypothesisId: "E",
          runId: "pre-fix"
        })
      }).catch(() => {});
      // #endregion
      unsub = onValue(
        node,
        (snapshot) => {
          const value = (snapshot.val() ?? {}) as Record<string, Partial<LiveLocation>>;
          const rows: LiveLocation[] = Object.entries(value)
            .map(([driverId, v]) => ({
              driverId,
              lat: Number(v.lat),
              lng: Number(v.lng),
              heading: v.heading ?? null,
              status: v.status ?? null,
              tripId: v.tripId ?? null,
              updatedAt: Number(v.updatedAt ?? 0)
            }))
            .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
          // #region agent log
          fetch("http://127.0.0.1:7828/ingest/5d13c92e-444f-4436-80ad-efa5547b25d2", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "de9315" },
            body: JSON.stringify({
              sessionId: "de9315",
              location: "use-live-locations.ts:onValue",
              message: "RTDB snapshot received",
              data: {
                rawKeyCount: Object.keys(value).length,
                validLocationCount: rows.length,
                driverIds: Object.keys(value).slice(0, 5)
              },
              timestamp: Date.now(),
              hypothesisId: "E",
              runId: "pre-fix"
            })
          }).catch(() => {});
          // #endregion
          setLocations(rows);
          setReady(true);
        },
        (error) => {
          // #region agent log
          fetch("http://127.0.0.1:7828/ingest/5d13c92e-444f-4436-80ad-efa5547b25d2", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "de9315" },
            body: JSON.stringify({
              sessionId: "de9315",
              location: "use-live-locations.ts:onValue",
              message: "RTDB listener error",
              data: { error: error?.message ?? "unknown" },
              timestamp: Date.now(),
              hypothesisId: "E",
              runId: "pre-fix"
            })
          }).catch(() => {});
          // #endregion
          setReady(true);
        }
      );
    } catch {
      setReady(true);
    }
    return () => unsub();
  }, []);

  return { locations, ready };
}
