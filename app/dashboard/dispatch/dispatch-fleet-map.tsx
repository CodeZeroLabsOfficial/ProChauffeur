"use client";

import { useMemo, useState } from "react";
import MapGL, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import { MapPinIcon } from "lucide-react";

import { AnimatedDriverMarker } from "@/app/dashboard/dispatch/animated-driver-marker";
import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import { useDispatchMapFit } from "@/hooks/use-dispatch-map-fit";
import {
  hasValidCoordinate,
  includeLngLat,
  includeCoordinate,
  MAP_FALLBACK_VIEW,
  type LngLatBBox,
  type MapViewState
} from "@/lib/mapbox/coordinates";
import { initialViewFromBBox } from "@/lib/mapbox/fit-map-camera";
import type { Trip } from "@/lib/models/trip";
import { cn } from "@/lib/utils";

export function DispatchFleetMap({
  token,
  mapStyle,
  locations,
  activeTrips,
  driverNameById,
  vehicleMakeByTripId,
  companyDefaultView,
  selectedTripId,
  onSelectTrip
}: {
  token: string;
  mapStyle: string;
  locations: DriverLiveLocation[];
  activeTrips: Trip[];
  driverNameById: Map<string, string>;
  vehicleMakeByTripId: Map<string, string>;
  companyDefaultView: MapViewState | null;
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
}) {
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
  const fallbackView = companyDefaultView ?? MAP_FALLBACK_VIEW;

  const fitBBox = useMemo((): LngLatBBox | null => {
    let bbox: LngLatBBox | null = null;
    for (const loc of locations) {
      bbox = includeLngLat(bbox, loc.lng, loc.lat);
    }
    for (const trip of activeTrips) {
      if (hasValidCoordinate(trip.pickup)) {
        bbox = includeCoordinate(bbox, trip.pickup);
      }
    }
    return bbox;
  }, [locations, activeTrips]);

  const fleetResetKey = useMemo(
    () =>
      `fleet-${activeTrips
        .map((t) => t.id)
        .sort()
        .join(",")}`,
    [activeTrips]
  );

  useDispatchMapFit({
    map: mapRef,
    bbox: fitBBox,
    fallbackView,
    once: locations.length > 0 || activeTrips.length > 0,
    resetKey: fleetResetKey,
    flushKey: fitBBox && fitBBox.count > 0 ? "points" : ""
  });

  return (
    <MapGL
      ref={setMapRef}
      mapboxAccessToken={token}
      initialViewState={initialViewFromBBox(fitBBox, fallbackView)}
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%" }}>
      <NavigationControl position="top-right" />
      {locations.map((loc) => (
        <AnimatedDriverMarker
          key={loc.tripId}
          location={loc}
          title={driverNameById.get(loc.driverId) ?? loc.driverId}
          vehicleMake={vehicleMakeByTripId.get(loc.tripId)}
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
