"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { ExternalLinkIcon } from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

import { LiveTripPanel } from "@/components/live-trip-panel";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { useLiveLocations } from "@/hooks/use-live-locations";
import { useFleetLocations, useUsers, useVehicles } from "@/hooks/use-collections";
import { getMapboxToken } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { companyDefaultMapView, tripPickupReferenceDate, type Trip } from "@/lib/models";
import { resolveDriverLocation } from "@/lib/mapbox/dispatch-map-mode";
import { effectiveChauffeurUserId } from "@/lib/models/vehicle";
import { shortBookingId } from "@/lib/bookings/booking-display";

export function BookingLiveSheet({
  trip,
  open,
  onOpenChange
}: {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { resolvedTheme } = useTheme();
  const { locations, ready } = useLiveLocations();
  const { users } = useUsers();
  const { vehicles } = useVehicles();
  const { locations: fleetLocations } = useFleetLocations();

  let token = "";
  let tokenError = false;
  try {
    token = getMapboxToken();
  } catch {
    tokenError = true;
  }

  const driverNameById = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    for (const u of users) map.set(u.id, u.profile.displayName || u.email);
    return map;
  }, [users]);

  const vehicleMakeByDriverId = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    for (const v of vehicles) {
      const driverId = effectiveChauffeurUserId(v) ?? v.driverID;
      const make = v.details?.make?.trim();
      if (driverId && make) map.set(driverId, make);
    }
    return map;
  }, [vehicles]);

  const companyDefaultView = useMemo(
    () => companyDefaultMapView(fleetLocations),
    [fleetLocations]
  );

  const driverLocation = trip ? resolveDriverLocation(trip, locations) : null;

  const mapStyle =
    resolvedTheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";

  const chauffeurName = trip?.driverID
    ? (driverNameById.get(trip.driverID) ?? "Assigned")
    : "Unassigned";

  const vehicleMake = trip
    ? (trip.driverID ? vehicleMakeByDriverId.get(trip.driverID) : undefined) ||
      trip.vehicleSnapshot?.details?.make?.trim() ||
      null
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 space-y-3 border-b p-4 text-left">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="truncate">
                {trip ? `Booking ${shortBookingId(trip.id)}` : "Booking"}
              </SheetTitle>
              {trip ? (
                <p className="text-muted-foreground text-sm">
                  {formatDateTime(tripPickupReferenceDate(trip))}
                </p>
              ) : null}
            </div>
            {trip ? <TripStatusBadge status={trip.status} /> : null}
          </div>
          {trip ? (
            <div className="text-muted-foreground space-y-1 text-sm">
              <p>
                <span className="text-foreground font-medium">Customer: </span>
                {trip.customerDisplayName || "Customer"}
              </p>
              <p>
                <span className="text-foreground font-medium">Chauffeur: </span>
                {chauffeurName}
              </p>
              <p className="truncate">
                <span className="text-foreground font-medium">Pickup: </span>
                {trip.pickupAddressLine || "Not set"}
              </p>
              <p className="truncate">
                <span className="text-foreground font-medium">Dropoff: </span>
                {trip.dropoffAddressLine || "Not set"}
              </p>
            </div>
          ) : null}
        </SheetHeader>

        <div className="min-h-[320px] flex-1">
          {tokenError ? (
            <div className="text-muted-foreground flex h-full min-h-[320px] items-center justify-center p-6 text-center text-sm">
              Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the live map.
            </div>
          ) : trip && open ? (
            <div className="h-full min-h-[320px]">
              <LiveTripPanel
                trip={trip}
                driverLocation={driverLocation}
                driverName={trip.driverID ? chauffeurName : null}
                vehicleMake={vehicleMake}
                companyDefaultView={companyDefaultView}
                token={token}
                mapStyle={mapStyle}
                liveCount={locations.length}
                liveReady={ready}
              />
            </div>
          ) : null}
        </div>

        {trip ? (
          <div className="shrink-0 border-t p-4">
            <Button asChild variant="outline" className="w-full">
              <Link href={`/dashboard/bookings/${trip.id}`}>
                <ExternalLinkIcon className="size-4" />
                Open booking detail
              </Link>
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
