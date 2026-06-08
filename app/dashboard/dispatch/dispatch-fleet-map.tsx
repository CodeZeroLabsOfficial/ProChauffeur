"use client";

import { useEffect, useMemo, useState } from "react";
import MapGL, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import { MapPinIcon } from "lucide-react";

import type { LiveLocation } from "@/hooks/use-live-locations";
import { AnimatedDriverMarker } from "@/app/dashboard/dispatch/animated-driver-marker";
import {
  boundsFromPoints,
  centerFromPoints,
  coordinateFromLatLng,
  hasValidCoordinate,
  MAP_FALLBACK_VIEW,
  type MapViewState
} from "@/lib/mapbox/coordinates";
import type { Trip } from "@/lib/models/trip";
import { cn } from "@/lib/utils";

export function DispatchFleetMap({
  token,
  mapStyle,
  locations,
  activeTrips,
  driverNameById,
  vehicleMakeByDriverId,
  companyDefaultView,
  selectedTripId,
  onSelectTrip
}: {
  token: string;
  mapStyle: string;
  locations: LiveLocation[];
  activeTrips: Trip[];
  driverNameById: Map<string, string>;
  vehicleMakeByDriverId: Map<string, string>;
  companyDefaultView: MapViewState | null;
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
}) {
  const [mapRef, setMapRef] = useState<MapRef | null>(null);

  const fitPoints = useMemo(() => {
    const driverPoints = locations.map((loc) => coordinateFromLatLng(loc.lat, loc.lng));
    const pickupPoints = activeTrips.filter((t) => hasValidCoordinate(t.pickup)).map((t) => t.pickup);
    return [...driverPoints, ...pickupPoints];
  }, [locations, activeTrips]);

  const initialViewState = useMemo(() => {
    if (fitPoints.length > 0) return centerFromPoints(fitPoints);
    return companyDefaultView ?? MAP_FALLBACK_VIEW;
  }, [fitPoints, companyDefaultView]);

  useEffect(() => {
    if (!mapRef) return;

    if (fitPoints.length === 0) {
      const view = companyDefaultView ?? MAP_FALLBACK_VIEW;
      mapRef.flyTo({
        center: [view.longitude, view.latitude],
        zoom: view.zoom,
        duration: 500
      });
      return;
    }

    if (fitPoints.length === 1) {
      mapRef.flyTo({
        center: [fitPoints[0].longitude, fitPoints[0].latitude],
        zoom: 13,
        duration: 500
      });
      return;
    }

    mapRef.fitBounds(boundsFromPoints(fitPoints), {
      padding: 64,
      duration: 500
    });
  }, [mapRef, fitPoints, companyDefaultView]);

  return (
    <MapGL
      ref={setMapRef}
      mapboxAccessToken={token}
      initialViewState={initialViewState}
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%" }}>
      <NavigationControl position="top-right" />
      {locations.map((loc) => (
        <AnimatedDriverMarker
          key={loc.driverId}
          location={loc}
          title={driverNameById.get(loc.driverId) ?? loc.driverId}
          vehicleMake={
            vehicleMakeByDriverId.get(loc.driverId) ??
            activeTrips.find((t) => t.id === loc.tripId)?.vehicleSnapshot?.make
          }
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
