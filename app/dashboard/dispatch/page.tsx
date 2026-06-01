"use client";

import { useMemo, useState } from "react";
import MapGL, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import { useTheme } from "next-themes";
import { CarFrontIcon, MapPinIcon, RadioIcon } from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

import { getMapboxToken } from "@/lib/env";
import { useLiveLocations } from "@/hooks/use-live-locations";
import { useTrips, useUsers } from "@/hooks/use-collections";
import { tripPickupReferenceDate, upcomingTripStatuses } from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Default to Sydney CBD (AU operations).
const DEFAULT_VIEW = { longitude: 151.2093, latitude: -33.8688, zoom: 11 };

export default function DispatchPage() {
  const { resolvedTheme } = useTheme();
  const { locations, ready } = useLiveLocations();
  const { trips } = useTrips();
  const { users } = useUsers();
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
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

  const mapStyle =
    resolvedTheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";

  function focusTrip(tripId: string, lng: number, lat: number) {
    setSelectedTripId(tripId);
    mapRef?.flyTo({ center: [lng, lat], zoom: 13, duration: 800 });
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

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="order-2 lg:order-1">
          <CardContent className="p-0">
            <div className="border-b p-4">
              <p className="text-sm font-semibold">Active trips</p>
              <p className="text-muted-foreground text-xs">{activeTrips.length} requiring attention</p>
            </div>
            <ScrollArea className="h-[420px] lg:h-[600px]">
              <div className="divide-y">
                {activeTrips.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-center text-sm">No active trips.</p>
                ) : (
                  activeTrips.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => focusTrip(t.id, t.pickup.longitude, t.pickup.latitude)}
                      className={cn(
                        "hover:bg-muted/60 flex w-full flex-col gap-1.5 p-4 text-left transition-colors",
                        selectedTripId === t.id && "bg-muted"
                      )}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t.customerDisplayName || "Customer"}
                        </span>
                        <TripStatusBadge status={t.status} />
                      </div>
                      <span className="text-muted-foreground flex items-center gap-1 text-xs">
                        <MapPinIcon className="size-3" />
                        {t.pickupAddressLine || "Pickup"} → {t.dropoffAddressLine || "Drop-off"}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatDateTime(tripPickupReferenceDate(t))}
                        {t.driverID && ` · ${driverNameById.get(t.driverID) ?? "Assigned"}`}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="order-1 overflow-hidden lg:order-2">
          <CardContent className="p-0">
            <div className="h-[420px] w-full lg:h-[668px]">
              {tokenError ? (
                <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
                  Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the dispatch map.
                </div>
              ) : (
                <MapGL
                  ref={setMapRef}
                  mapboxAccessToken={token}
                  initialViewState={DEFAULT_VIEW}
                  mapStyle={mapStyle}
                  style={{ width: "100%", height: "100%" }}>
                  <NavigationControl position="top-right" />
                  {locations.map((loc) => (
                    <Marker key={loc.driverId} longitude={loc.lng} latitude={loc.lat} anchor="center">
                      <div
                        className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-lg"
                        title={driverNameById.get(loc.driverId) ?? loc.driverId}>
                        <CarFrontIcon className="size-4" />
                      </div>
                    </Marker>
                  ))}
                  {activeTrips.map((t) => (
                    <Marker
                      key={`pickup-${t.id}`}
                      longitude={t.pickup.longitude}
                      latitude={t.pickup.latitude}
                      anchor="bottom"
                      onClick={() => setSelectedTripId(t.id)}>
                      <MapPinIcon
                        className={cn(
                          "size-6 drop-shadow",
                          selectedTripId === t.id ? "text-red-500" : "text-amber-500"
                        )}
                      />
                    </Marker>
                  ))}
                </MapGL>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
