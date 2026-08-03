"use client";

import { DispatchLivePill } from "@/components/dispatch-live-pill";
import { DispatchTripMap } from "@/app/dashboard/dispatch/dispatch-trip-map";
import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import type { MapViewState } from "@/lib/mapbox/coordinates";
import type { Trip } from "@/lib/models/trip";

export function LiveTripPanel({
  trip,
  driverLocation,
  driverName,
  vehicleMake,
  companyDefaultView,
  token,
  mapStyle,
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
  liveCount: number;
  liveReady: boolean;
}) {
  return (
    <div className="relative h-full min-h-0 w-full">
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
  );
}
