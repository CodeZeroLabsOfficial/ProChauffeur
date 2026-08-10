"use client";

import { useMemo, useState } from "react";
import MapGL, { NavigationControl, type MapRef } from "react-map-gl/mapbox";

import { AnimatedDriverMarker } from "@/app/dashboard/dispatch/animated-driver-marker";
import { DispatchMapPin } from "@/components/dispatch-map-pin";
import { DispatchStopMarker } from "@/components/dispatch-stop-marker";
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
      if (hasValidCoordinate(trip.journey.pickup)) {
        bbox = includeCoordinate(bbox, trip.journey.pickup);
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
      {activeTrips
        .filter((t) => hasValidCoordinate(t.journey.pickup))
        .map((t) => (
          <DispatchStopMarker
            key={`pickup-${t.id}`}
            longitude={t.journey.pickup.longitude}
            latitude={t.journey.pickup.latitude}
            onClick={() => onSelectTrip(t.id)}>
            <DispatchMapPin
              variant="pickup"
              className={selectedTripId === t.id ? "scale-110" : undefined}
            />
          </DispatchStopMarker>
        ))}
    </MapGL>
  );
}
