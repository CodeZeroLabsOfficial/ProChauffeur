"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { realtimeDb } from "@/lib/firebase/client";
import { rtdbBranchLiveTripsPath } from "@/lib/models";

/** Ephemeral chauffeur GPS from RTDB `liveTrips/{branchId}/{tripId}`. */
export interface DriverLiveLocation {
  tripId: string;
  driverId: string;
  customerId: string | null;
  lat: number;
  lng: number;
  heading: number | null;
  status: string | null;
  updatedAt: number;
}

function parseLiveLocations(value: unknown): DriverLiveLocation[] {
  const record = (value ?? {}) as Record<string, Record<string, unknown>>;
  return Object.entries(record)
    .map(([tripId, v]) => {
      const headingRaw = v.heading;
      const heading =
        typeof headingRaw === "number" && headingRaw >= 0 && headingRaw <= 360
          ? headingRaw
          : null;
      return {
        tripId,
        driverId: typeof v.driverId === "string" ? v.driverId : "",
        customerId: typeof v.customerId === "string" ? v.customerId : null,
        lat: Number(v.lat),
        lng: Number(v.lng),
        heading,
        status: typeof v.status === "string" ? v.status : null,
        updatedAt: Number(v.updatedAt ?? 0)
      };
    })
    .filter(
      (r) =>
        r.driverId.length > 0 && Number.isFinite(r.lat) && Number.isFinite(r.lng)
    );
}

/** Subscribes to live trip positions for the active branch. */
export function useLiveLocations(): { locations: DriverLiveLocation[]; ready: boolean } {
  const { branchId } = useActiveBranch();
  const [locations, setLocations] = useState<DriverLiveLocation[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub = () => {};
    let cancelled = false;

    try {
      const node = ref(realtimeDb(), rtdbBranchLiveTripsPath(branchId));
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
