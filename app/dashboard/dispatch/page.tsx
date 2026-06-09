"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { FilterIcon, RadioIcon } from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

import { DispatchFleetMap } from "@/app/dashboard/dispatch/dispatch-fleet-map";
import { DispatchTripMap } from "@/app/dashboard/dispatch/dispatch-trip-map";
import { getMapboxToken } from "@/lib/env";
import { useLiveLocations } from "@/hooks/use-live-locations";
import { useTrips, useUsers, useVehicles, useFleetLocations } from "@/hooks/use-collections";
import { resolveDriverLocation } from "@/lib/mapbox/dispatch-map-mode";
import { companyDefaultMapView, tripPickupReferenceDate, tripStatusTitle, upcomingTripStatuses, type Trip } from "@/lib/models";
import { effectiveChauffeurUserId } from "@/lib/models/vehicle";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { ListFilterOption } from "@/components/list-filter-popover";

function shortBookingId(id: string) {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

export default function DispatchPage() {
  const { resolvedTheme } = useTheme();
  const { locations, ready } = useLiveLocations();
  const { trips } = useTrips();
  const { users } = useUsers();
  const { vehicles } = useVehicles();
  const { locations: fleetLocations } = useFleetLocations();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

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
      if (driverId) map.set(driverId, v.make);
    }
    return map;
  }, [vehicles]);

  const companyDefaultView = useMemo(
    () => companyDefaultMapView(fleetLocations),
    [fleetLocations]
  );

  const activeTrips = useMemo(
    () =>
      trips
        .filter((t) => upcomingTripStatuses.includes(t.status))
        .sort(
          (a, b) => tripPickupReferenceDate(a).getTime() - tripPickupReferenceDate(b).getTime()
        ),
    [trips]
  );

  const filteredActiveTrips = useMemo(() => {
    if (statusFilter.length === 0) return activeTrips;
    return activeTrips.filter((t) => statusFilter.includes(t.status));
  }, [activeTrips, statusFilter]);

  const statusFilterOptions = useMemo(
    () =>
      upcomingTripStatuses.map((status) => ({
        value: status,
        label: tripStatusTitle[status]
      })),
    []
  );

  const selectedTrip = useMemo(
    () => filteredActiveTrips.find((t) => t.id === selectedTripId) ?? null,
    [filteredActiveTrips, selectedTripId]
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        title="Dispatch"
        actions={
          <Badge variant="outline" className="gap-1.5">
            <RadioIcon className={cn("size-3.5", ready ? "text-green-500" : "text-muted-foreground")} />
            {locations.length} live
          </Badge>
        }
      />

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4 lg:grid-cols-[360px_1fr] lg:grid-rows-1 lg:items-stretch">
        <Card className="order-2 flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0 lg:order-1">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b p-4">
              <p className="text-sm font-semibold">Active trips</p>
              <ActiveTripsStatusFilter
                options={statusFilterOptions}
                selected={statusFilter}
                onSelectedChange={setStatusFilter}
              />
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div>
                {filteredActiveTrips.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-center text-sm">No active trips.</p>
                ) : (
                  filteredActiveTrips.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTripSelection(t.id)}
                      className={cn(
                        "border-border hover:bg-muted/60 flex w-full flex-col gap-3 border-b p-4 text-left transition-colors",
                        selectedTripId === t.id && "bg-muted"
                      )}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-foreground text-sm font-medium">
                          {chauffeurLabel(t)}
                        </span>
                        <TripStatusBadge status={t.status} />
                      </div>
                      <p className="text-muted-foreground text-xs">{shortBookingId(t.id)}</p>
                      <Separator />
                      <TripRouteStops
                        pickup={t.pickupAddressLine || "Pickup location not set"}
                        dropoff={t.dropoffAddressLine || "Destination not set"}
                      />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="order-1 flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0 lg:order-2">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="h-full min-h-0 flex-1">
              {tokenError ? (
                <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
                  Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the dispatch map.
                </div>
              ) : selectedTrip ? (
                <DispatchTripMap
                  key={selectedTrip.id}
                  trip={selectedTrip}
                  driverLocation={selectedDriverLocation}
                  driverName={
                    selectedTrip.driverID
                      ? (driverNameById.get(selectedTrip.driverID) ?? "Assigned")
                      : null
                  }
                  companyDefaultView={companyDefaultView}
                  token={token}
                  mapStyle={mapStyle}
                />
              ) : (
                <DispatchFleetMap
                  token={token}
                  mapStyle={mapStyle}
                  locations={locations}
                  activeTrips={filteredActiveTrips}
                  driverNameById={driverNameById}
                  vehicleMakeByDriverId={vehicleMakeByDriverId}
                  companyDefaultView={companyDefaultView}
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

function ActiveTripsStatusFilter({
  options,
  selected,
  onSelectedChange
}: {
  options: ListFilterOption[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
}) {
  function toggle(value: string) {
    if (selected.includes(value)) {
      onSelectedChange(selected.filter((v) => v !== value));
    } else {
      onSelectedChange([...selected, value]);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Filter by status">
          <FilterIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-0" align="end">
        <Command>
          <CommandInput placeholder="Status" className="h-9" />
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => toggle(option.value)}>
                  <div className="flex items-center space-x-3 py-1">
                    <Checkbox
                      id={`active-trips-status-${option.value}`}
                      checked={selected.includes(option.value)}
                      onCheckedChange={() => toggle(option.value)}
                    />
                    <label
                      htmlFor={`active-trips-status-${option.value}`}
                      className="leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {option.label}
                    </label>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RouteStopDot({ variant }: { variant: "pickup" | "dropoff" }) {
  const isPickup = variant === "pickup";
  return (
    <span
      className={cn(
        "flex size-3 shrink-0 items-center justify-center rounded-full border-2",
        isPickup ? "border-primary" : "border-muted-foreground/50"
      )}>
      <span
        className={cn(
          "size-1 rounded-full",
          isPickup ? "bg-primary" : "bg-muted-foreground/50"
        )}
      />
    </span>
  );
}

function TripRouteStops({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center pt-0.5">
        <RouteStopDot variant="pickup" />
        <span className="border-border min-h-4 flex-1 border-l border-dashed" />
        <RouteStopDot variant="dropoff" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-foreground text-sm font-semibold break-words">{pickup}</p>
        <p className="text-foreground text-sm font-semibold break-words">{dropoff}</p>
      </div>
    </div>
  );
}
