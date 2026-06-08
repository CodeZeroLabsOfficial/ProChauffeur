"use client";

import MapGL, { Marker, NavigationControl } from "react-map-gl/mapbox";
import { MapPinIcon } from "lucide-react";

import type { LiveLocation } from "@/hooks/use-live-locations";
import { AnimatedDriverMarker } from "@/app/dashboard/dispatch/animated-driver-marker";
import type { Trip } from "@/lib/models/trip";
import { cn } from "@/lib/utils";

const DEFAULT_VIEW = { longitude: 151.2093, latitude: -33.8688, zoom: 11 };

export function DispatchFleetMap({
  token,
  mapStyle,
  locations,
  activeTrips,
  driverNameById,
  selectedTripId,
  onSelectTrip
}: {
  token: string;
  mapStyle: string;
  locations: LiveLocation[];
  activeTrips: Trip[];
  driverNameById: Map<string, string>;
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
}) {
  return (
    <MapGL
      mapboxAccessToken={token}
      initialViewState={DEFAULT_VIEW}
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%" }}>
      <NavigationControl position="top-right" />
      {locations.map((loc) => (
        <AnimatedDriverMarker
          key={loc.driverId}
          location={loc}
          title={driverNameById.get(loc.driverId) ?? loc.driverId}
        />
      ))}
      {activeTrips.map((t) => (
        <Marker
          key={`pickup-${t.id}`}
          longitude={t.pickup.longitude}
          latitude={t.pickup.latitude}
          anchor="bottom"
          onClick={() => onSelectTrip(t.id)}>
          <MapPinIcon
            className={cn(
              "size-6 drop-shadow",
              selectedTripId === t.id ? "text-red-500" : "text-amber-500"
            )}
          />
        </Marker>
      ))}
    </MapGL>
  );
}
