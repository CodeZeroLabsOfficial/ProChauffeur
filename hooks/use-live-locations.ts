"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { isBranchesDualReadEnabled } from "@/lib/branch/dual-read";
import { realtimeDb } from "@/lib/firebase/client";
import { rtdbBranchLiveLocationsPath, rtdbLiveLocationsPath } from "@/lib/models";

/** One live driver/vehicle position from RTDB. */
export interface LiveLocation {
  driverId: string;
  lat: number;
  lng: number;
  heading: number | null;
  status: string | null;
  tripId: string | null;
  updatedAt: number;
}

function parseLiveLocations(value: unknown): LiveLocation[] {
  const record = (value ?? {}) as Record<string, Partial<LiveLocation>>;
  return Object.entries(record)
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
}

/**
 * Subscribes to live driver positions for the active branch.
 * Falls back to the legacy flat path when dual-read is enabled and nested is empty.
 */
export function useLiveLocations(): { locations: LiveLocation[]; ready: boolean } {
  const { branchId } = useActiveBranch();
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubLegacy = () => {};
    let unsubNested = () => {};
    let cancelled = false;

    try {
      const nestedNode = ref(realtimeDb(), rtdbBranchLiveLocationsPath(branchId));
      unsubNested = onValue(
        nestedNode,
        (snapshot) => {
          if (cancelled) return;
          const rows = parseLiveLocations(snapshot.val());
          if (rows.length > 0 || !isBranchesDualReadEnabled()) {
            unsubLegacy();
            unsubLegacy = () => {};
            setLocations(rows);
            setReady(true);
            return;
          }

          const legacyNode = ref(realtimeDb(), rtdbLiveLocationsPath);
          unsubLegacy = onValue(
            legacyNode,
            (legacySnap) => {
              if (cancelled) return;
              setLocations(parseLiveLocations(legacySnap.val()));
              setReady(true);
            },
            () => setReady(true)
          );
        },
        () => setReady(true)
      );
    } catch {
      setReady(true);
    }

    return () => {
      cancelled = true;
      unsubNested();
      unsubLegacy();
    };
  }, [branchId]);

  return { locations, ready };
}
