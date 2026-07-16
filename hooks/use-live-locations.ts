"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { realtimeDb } from "@/lib/firebase/client";
import { rtdbBranchLiveLocationsPath } from "@/lib/models";

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

/** Subscribes to live driver positions for the active branch (nested RTDB path only). */
export function useLiveLocations(): { locations: LiveLocation[]; ready: boolean } {
  const { branchId } = useActiveBranch();
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;

    try {
      const node = ref(realtimeDb(), rtdbBranchLiveLocationsPath(branchId));
      unsub = onValue(
        node,
        (snapshot) => {
          if (cancelled) return;
          setLocations(parseLiveLocations(snapshot.val()));
          setReady(true);
        },
        () => setReady(true)
      );
    } catch {
      setReady(true);
    }

    return () => {
      cancelled = true;
      unsub();
    };
  }, [branchId]);

  return { locations, ready };
}
