"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { CalendarIcon, CarFrontIcon, MapPinIcon, RadioIcon } from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

import { DispatchFleetMap } from "@/app/dashboard/dispatch/dispatch-fleet-map";
import { DispatchTripMap } from "@/app/dashboard/dispatch/dispatch-trip-map";
import { getMapboxToken } from "@/lib/env";
import { useLiveLocations } from "@/hooks/use-live-locations";
import { useTrips, useUsers } from "@/hooks/use-collections";
import { resolveDriverLocation } from "@/lib/mapbox/dispatch-map-mode";
import { tripPickupReferenceDate, upcomingTripStatuses, type Trip } from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export default function DispatchPage() {
  const { resolvedTheme } = useTheme();
  const { locations, ready } = useLiveLocations();
  const { trips } = useTrips();
  const { users } = useUsers();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

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

  const activeTrips = useMemo(
    () =>
      trips
        .filter((t) => upcomingTripStatuses.includes(t.status))
        .sort(
          (a, b) => tripPickupReferenceDate(a).getTime() - tripPickupReferenceDate(b).getTime()
        ),
    [trips]
  );

  const selectedTrip = useMemo(
    () => activeTrips.find((t) => t.id === selectedTripId) ?? null,
    [activeTrips, selectedTripId]
  );

  const selectedDriverLocation = useMemo(
    () => (selectedTrip ? resolveDriverLocation(selectedTrip, locations) : null),
    [selectedTrip, locations]
  );

  const mapStyle =
    resolvedTheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";

  function toggleTripSelection(tripId: string) {
    setSelectedTripId((current) => (current === tripId ? null : tripId));
  }

  function chauffeurLabel(trip: Trip) {
    if (!trip.driverID) return "Unassigned";
    return driverNameById.get(trip.driverID) ?? "Assigned";
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dispatch"
        description="Live driver positions and active trips. Locations stream from Realtime Database."
        actions={
          <Badge variant="outline" className="gap-1.5">
            <RadioIcon className={cn("size-3.5", ready ? "text-green-500" : "text-muted-foreground")} />
            {locations.length} live
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr] lg:items-stretch">
        <Card className="order-2 flex flex-col gap-0 py-0 lg:order-1">
          <CardContent className="flex flex-1 flex-col p-0">
            <div className="border-b p-4">
              <p className="text-sm font-semibold">Active trips</p>
              <p className="text-muted-foreground text-xs">{activeTrips.length} requiring attention</p>
            </div>
            <ScrollArea className="min-h-[420px] flex-1">
              <div className="divide-y">
                {activeTrips.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-center text-sm">No active trips.</p>
                ) : (
                  activeTrips.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTripSelection(t.id)}
                      className={cn(
                        "hover:bg-muted/60 flex w-full flex-col gap-2 p-4 text-left transition-colors",
                        selectedTripId === t.id && "bg-muted"
                      )}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium">
                          {t.customerDisplayName || "Customer"}
                        </span>
                        <TripStatusBadge status={t.status} />
                      </div>
                      <TripDetailLine icon={<CarFrontIcon className="size-3.5" />}>
                        {chauffeurLabel(t)}
                      </TripDetailLine>
                      <TripDetailLine icon={<CalendarIcon className="size-3.5" />}>
                        {formatDateTime(tripPickupReferenceDate(t))}
                      </TripDetailLine>
                      <TripDetailLine icon={<MapPinIcon className="size-3.5 text-green-600" />}>
                        {t.pickupAddressLine || "Pickup location not set"}
                      </TripDetailLine>
                      <TripDetailLine icon={<MapPinIcon className="size-3.5 text-red-500" />}>
                        {t.dropoffAddressLine || "Destination not set"}
                      </TripDetailLine>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="order-1 flex min-h-[420px] flex-col gap-0 overflow-hidden py-0 lg:order-2">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="min-h-[420px] flex-1">
              {tokenError ? (
                <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
                  Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the dispatch map.
                </div>
              ) : selectedTrip ? (
                <DispatchTripMap
                  trip={selectedTrip}
                  driverLocation={selectedDriverLocation}
                  driverName={
                    selectedTrip.driverID
                      ? (driverNameById.get(selectedTrip.driverID) ?? "Assigned")
                      : null
                  }
                  token={token}
                  mapStyle={mapStyle}
                />
              ) : (
                <DispatchFleetMap
                  token={token}
                  mapStyle={mapStyle}
                  locations={locations}
                  activeTrips={activeTrips}
                  driverNameById={driverNameById}
                  selectedTripId={selectedTripId}
                  onSelectTrip={toggleTripSelection}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TripDetailLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="text-muted-foreground flex items-start gap-2 text-xs">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </span>
  );
}
