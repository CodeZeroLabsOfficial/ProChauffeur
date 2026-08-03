"use client";

import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay } from "date-fns";
import { FilterIcon, ListIcon, MapIcon } from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

import { DispatchActiveTripCard } from "@/app/dashboard/dispatch/dispatch-active-trip-card";
import { DispatchActiveTripsTable } from "@/app/dashboard/dispatch/dispatch-active-trips-table";
import { DispatchFleetMap } from "@/app/dashboard/dispatch/dispatch-fleet-map";
import { DispatchLivePill } from "@/components/dispatch-live-pill";
import { LiveTripPanel } from "@/components/live-trip-panel";
import { getMapboxToken } from "@/lib/env";
import { useActiveTripsProgress } from "@/hooks/use-active-trips-progress";
import { useLiveLocations } from "@/hooks/use-live-locations";
import { useTrips, useUsers, useVehicles, useFleetLocations } from "@/hooks/use-collections";
import { dispatchMapMode, resolveDriverLocation } from "@/lib/mapbox/dispatch-map-mode";
import {
  companyDefaultMapView,
  tripPickupReferenceDate,
  tripStatusTitle,
  upcomingTripStatuses,
  type Trip
} from "@/lib/models";
import { effectiveChauffeurUserId } from "@/lib/models/vehicle";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import type { ListFilterOption } from "@/components/list-filter-popover";

const activeTripsPeriodPresets = [
  { name: "Today", value: "today" },
  { name: "This Week", value: "thisWeek" },
  { name: "This Month", value: "thisMonth" },
  { name: "This Year", value: "thisYear" }
] as const;

type ActiveTripsPeriodFilter = (typeof activeTripsPeriodPresets)[number]["value"] | "all";
type DispatchViewMode = "map" | "table";

function activeTripsRangeForPreset(type: ActiveTripsPeriodFilter, reference = new Date()) {
  const from = startOfDay(reference);

  switch (type) {
    case "today":
      return { from, to: endOfDay(reference) };
    case "thisWeek":
      return { from, to: endOfWeek(reference) };
    case "thisMonth":
      return { from, to: endOfMonth(reference) };
    case "thisYear":
      return { from, to: endOfYear(reference) };
    default:
      return { from: undefined, to: undefined };
  }
}

function activeTripsPeriodLabel(period: ActiveTripsPeriodFilter) {
  if (period === "all") return null;
  return activeTripsPeriodPresets.find((preset) => preset.value === period)?.name ?? null;
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
  const [periodFilter, setPeriodFilter] = useState<ActiveTripsPeriodFilter>("all");
  const [viewMode, setViewMode] = useState<DispatchViewMode>("map");

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

  const driverPhotoById = useMemo(() => {
    const map = new globalThis.Map<string, string | null>();
    for (const u of users) map.set(u.id, u.profile.photoURL ?? null);
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

  const companyDefaultView = useMemo(() => companyDefaultMapView(fleetLocations), [fleetLocations]);

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
    let result = activeTrips;

    if (statusFilter.length > 0) {
      result = result.filter((t) => statusFilter.includes(t.status));
    }

    if (periodFilter !== "all") {
      const { from, to } = activeTripsRangeForPreset(periodFilter);
      if (from && to) {
        result = result.filter((t) => {
          const pickup = tripPickupReferenceDate(t);
          return pickup >= from && pickup <= to;
        });
      }
    }

    return result;
  }, [activeTrips, statusFilter, periodFilter]);

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

  const vehicleMakeByTripId = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    for (const trip of filteredActiveTrips) {
      const fromFleet = trip.driverID
        ? vehicleMakeByDriverId.get(trip.driverID)
        : undefined;
      const fromSnapshot = trip.vehicleSnapshot?.details?.make?.trim();
      const make = fromFleet || fromSnapshot;
      if (make) map.set(trip.id, make);
    }
    return map;
  }, [filteredActiveTrips, vehicleMakeByDriverId]);

  const { progressByTripId } = useActiveTripsProgress(
    filteredActiveTrips,
    locations,
    token,
    Boolean(token) && !tokenError
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

  function waitingForGps(trip: Trip) {
    const mode = dispatchMapMode(trip.status);
    if (mode !== "to_pickup" && mode !== "to_dropoff") return false;
    return !resolveDriverLocation(trip, locations);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Dispatch"
          actions={
            <div className="overflow-hidden rounded-md border">
              <Button
                type="button"
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                aria-label="Live map view"
                onClick={() => setViewMode("map")}>
                <MapIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                aria-label="Active trips table"
                onClick={() => setViewMode("table")}>
                <ListIcon className="size-4" />
              </Button>
            </div>
          }
        />
      </div>

      {viewMode === "table" ? (
        <Card className="flex h-0 min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b p-4">
              <p className="text-sm font-semibold">Active trips</p>
              <ActiveTripsFilter
                statusOptions={statusFilterOptions}
                statusSelected={statusFilter}
                onStatusSelectedChange={setStatusFilter}
                periodFilter={periodFilter}
                onPeriodFilterChange={setPeriodFilter}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <DispatchActiveTripsTable
                trips={filteredActiveTrips}
                progressByTripId={progressByTripId}
                locations={locations}
                chauffeurNameById={driverNameById}
                selectedTripId={selectedTripId}
                onSelectTrip={toggleTripSelection}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid h-0 min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4 overflow-hidden lg:grid-cols-[360px_1fr] lg:grid-rows-1 lg:items-stretch">
          <Card className="order-2 flex h-full min-h-0 flex-col gap-0 overflow-hidden py-0 lg:order-1">
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b p-4">
                <p className="text-sm font-semibold">Active trips</p>
                <ActiveTripsFilter
                  statusOptions={statusFilterOptions}
                  statusSelected={statusFilter}
                  onStatusSelectedChange={setStatusFilter}
                  periodFilter={periodFilter}
                  onPeriodFilterChange={setPeriodFilter}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {filteredActiveTrips.length === 0 ? (
                  <p className="text-muted-foreground p-6 text-center text-sm">No active trips.</p>
                ) : (
                  filteredActiveTrips.map((t) => (
                    <DispatchActiveTripCard
                      key={t.id}
                      trip={t}
                      progress={progressByTripId.get(t.id)!}
                      selected={selectedTripId === t.id}
                      chauffeurName={chauffeurLabel(t)}
                      chauffeurPhotoURL={
                        t.driverID ? driverPhotoById.get(t.driverID) : null
                      }
                      waitingForGps={waitingForGps(t)}
                      onSelect={() => toggleTripSelection(t.id)}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="order-1 flex h-full min-h-0 flex-col gap-0 overflow-hidden py-0 lg:order-2">
            <CardContent className="flex min-h-0 flex-1 flex-col p-0">
              <div className="relative h-full min-h-0 flex-1">
                {tokenError ? (
                  <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
                    Set NEXT_PUBLIC_MAPBOX_TOKEN to enable the dispatch map.
                  </div>
                ) : selectedTrip ? (
                  <LiveTripPanel
                    trip={selectedTrip}
                    driverLocation={selectedDriverLocation}
                    driverName={
                      selectedTrip.driverID
                        ? (driverNameById.get(selectedTrip.driverID) ?? "Assigned")
                        : null
                    }
                    vehicleMake={vehicleMakeByTripId.get(selectedTrip.id) ?? null}
                    companyDefaultView={companyDefaultView}
                    token={token}
                    mapStyle={mapStyle}
                    progress={progressByTripId.get(selectedTrip.id)!}
                    liveCount={locations.length}
                    liveReady={ready}
                  />
                ) : (
                  <>
                    <div className="absolute top-3 left-3 z-10">
                      <DispatchLivePill count={locations.length} ready={ready} />
                    </div>
                    <DispatchFleetMap
                      token={token}
                      mapStyle={mapStyle}
                      locations={locations}
                      activeTrips={filteredActiveTrips}
                      driverNameById={driverNameById}
                      vehicleMakeByTripId={vehicleMakeByTripId}
                      companyDefaultView={companyDefaultView}
                      selectedTripId={selectedTripId}
                      onSelectTrip={toggleTripSelection}
                    />
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ActiveTripsFilter({
  statusOptions,
  statusSelected,
  onStatusSelectedChange,
  periodFilter,
  onPeriodFilterChange
}: {
  statusOptions: ListFilterOption[];
  statusSelected: string[];
  onStatusSelectedChange: (selected: string[]) => void;
  periodFilter: ActiveTripsPeriodFilter;
  onPeriodFilterChange: (period: ActiveTripsPeriodFilter) => void;
}) {
  function toggleStatus(value: string) {
    if (statusSelected.includes(value)) {
      onStatusSelectedChange(statusSelected.filter((v) => v !== value));
    } else {
      onStatusSelectedChange([...statusSelected, value]);
    }
  }

  const periodLabel = activeTripsPeriodLabel(periodFilter);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Filter active trips">
          <FilterIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            Period
            {periodLabel ? ` (${periodLabel})` : ""}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={periodFilter}
              onValueChange={(value) => onPeriodFilterChange(value as ActiveTripsPeriodFilter)}>
              <DropdownMenuRadioItem value="all">All time</DropdownMenuRadioItem>
              {activeTripsPeriodPresets.map((preset) => (
                <DropdownMenuRadioItem key={preset.value} value={preset.value}>
                  {preset.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            Status
            {statusSelected.length > 0 ? ` (${statusSelected.length})` : ""}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {statusOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={statusSelected.includes(option.value)}
                onCheckedChange={() => toggleStatus(option.value)}
                onSelect={(e) => e.preventDefault()}>
                {option.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
