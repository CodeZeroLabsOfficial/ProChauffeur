import type { LiveLocation } from "@/hooks/use-live-locations";
import type { TripStatus } from "@/lib/models/enums";
import type { Trip } from "@/lib/models/trip";

export type DispatchMapMode = "overview" | "to_pickup" | "to_dropoff";

export function dispatchMapMode(status: TripStatus): DispatchMapMode {
  if (status === "requested" || status === "accepted") return "overview";
  if (status === "en_route_pickup") return "to_pickup";
  if (status === "in_progress") return "to_dropoff";
  return "overview";
}

export function resolveDriverLocation(trip: Trip, locations: LiveLocation[]): LiveLocation | null {
  if (trip.driverID) {
    const byDriver = locations.find((l) => l.driverId === trip.driverID);
    if (byDriver) return byDriver;
  }
  const byTrip = locations.find((l) => l.tripId === trip.id);
  if (byTrip) return byTrip;

  // Fallback while RTDB pin is absent: iOS always dual-writes Firestore `liveLocation`.
  if (trip.liveLocation) {
    return {
      driverId: trip.driverID ?? trip.id,
      lat: trip.liveLocation.latitude,
      lng: trip.liveLocation.longitude,
      heading: trip.liveHeadingDegrees ?? null,
      status: trip.status,
      tripId: trip.id,
      updatedAt: trip.updatedAt.getTime()
    };
  }

  return null;
}
