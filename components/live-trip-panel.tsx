"use client";

import { DispatchLivePill } from "@/components/dispatch-live-pill";
import { TripProgressBar } from "@/components/trip-progress-bar";
import { TripOnTimeBadge } from "@/components/trip-on-time-badge";
import { DispatchTripMap } from "@/app/dashboard/dispatch/dispatch-trip-map";
import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import type { MapViewState } from "@/lib/mapbox/coordinates";
import { dispatchMapMode } from "@/lib/mapbox/dispatch-map-mode";
import type { Trip } from "@/lib/models/trip";
import type { TripProgress } from "@/lib/trip-progress";

export function LiveTripPanel({
  trip,
  driverLocation,
  driverName,
  vehicleMake,
  companyDefaultView,
  token,
  mapStyle,
  progress,
  liveCount,
  liveReady
}: {
  trip: Trip;
  driverLocation: DriverLiveLocation | null;
  driverName: string | null;
  vehicleMake?: string | null;
  companyDefaultView: MapViewState | null;
  token: string;
  mapStyle: string;
  progress: TripProgress;
  liveCount: number;
  liveReady: boolean;
}) {
  const mode = dispatchMapMode(trip.status);
  const waitingForGps =
    (mode === "to_pickup" || mode === "to_dropoff") && !driverLocation;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {progress.kind !== "idle" ? (
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
          <div className="min-w-0 flex-1">
            <TripProgressBar progress={progress} waitingForGps={waitingForGps} />
          </div>
          <TripOnTimeBadge onTime={progress.onTime} />
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1">
        <div className="absolute top-3 left-3 z-10">
          <DispatchLivePill count={liveCount} ready={liveReady} />
        </div>
        <DispatchTripMap
          key={trip.id}
          trip={trip}
          driverLocation={driverLocation}
          driverName={driverName}
          vehicleMake={vehicleMake}
          companyDefaultView={companyDefaultView}
          token={token}
          mapStyle={mapStyle}
        />
      </div>
    </div>
  );
}
