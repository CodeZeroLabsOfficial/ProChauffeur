"use client";

import { useEffect, useMemo, useState } from "react";
import MapGL, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/mapbox";
import { MapPinIcon } from "lucide-react";

import { AnimatedDriverMarker } from "@/app/dashboard/dispatch/animated-driver-marker";
import type { LiveLocation } from "@/hooks/use-live-locations";
import { useMapboxRoute } from "@/hooks/use-mapbox-route";
import {
  boundsFromPoints,
  centerFromPoints,
  coordinateFromLatLng,
  hasValidCoordinate,
  MAP_FALLBACK_VIEW,
  type MapViewState
} from "@/lib/mapbox/coordinates";
import { dispatchMapMode } from "@/lib/mapbox/dispatch-map-mode";
import type { Trip } from "@/lib/models/trip";
import { cn } from "@/lib/utils";

const DEFAULT_VIEW = MAP_FALLBACK_VIEW;

export function DispatchTripMap({
  trip,
  driverLocation,
  driverName,
  companyDefaultView,
  token,
  mapStyle
}: {
  trip: Trip;
  driverLocation: LiveLocation | null;
  driverName: string | null;
  companyDefaultView: MapViewState | null;
  token: string;
  mapStyle: string;
}) {
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
  const mode = dispatchMapMode(trip.status);

  const driverCoordinate = useMemo(
    () => (driverLocation ? coordinateFromLatLng(driverLocation.lat, driverLocation.lng) : null),
    [driverLocation]
  );

  const overviewValid =
    hasValidCoordinate(trip.pickup) && hasValidCoordinate(trip.dropoff);
  const pickupValid = hasValidCoordinate(trip.pickup);
  const dropoffValid = hasValidCoordinate(trip.dropoff);

  const routeFrom =
    mode === "overview" ? trip.pickup : mode === "to_pickup" ? driverCoordinate : driverCoordinate;
  const routeTo =
    mode === "overview" ? trip.dropoff : mode === "to_pickup" ? trip.pickup : trip.dropoff;

  const routeEnabled =
    mode === "overview"
      ? overviewValid
      : Boolean(driverCoordinate) &&
        (mode === "to_pickup" ? pickupValid : dropoffValid);

  const liveDebounce = mode === "overview" ? 0 : 1000;

  const { route, error: routeError } = useMapboxRoute(routeFrom, routeTo, token, routeEnabled, {
    debounceMs: liveDebounce,
    resetKey: `${trip.id}-${mode}`
  });

  const fitPoints = useMemo(() => {
    if (mode === "overview" && overviewValid) {
      return [trip.pickup, trip.dropoff];
    }
    if (mode === "to_pickup" && pickupValid) {
      return driverCoordinate ? [driverCoordinate, trip.pickup] : [trip.pickup];
    }
    if (mode === "to_dropoff" && dropoffValid) {
      return driverCoordinate ? [driverCoordinate, trip.dropoff] : [trip.dropoff];
    }
    return [];
  }, [mode, overviewValid, pickupValid, dropoffValid, trip, driverCoordinate]);

  const initialViewState = useMemo(() => {
    if (fitPoints.length > 0) return centerFromPoints(fitPoints);
    return companyDefaultView ?? DEFAULT_VIEW;
  }, [fitPoints, companyDefaultView]);

  const waitingForGps =
    (mode === "to_pickup" || mode === "to_dropoff") && !driverCoordinate;

  const coordinatesUnavailable =
    (mode === "overview" && !overviewValid) ||
    (mode === "to_pickup" && !pickupValid) ||
    (mode === "to_dropoff" && !dropoffValid);

  useEffect(() => {
    if (!mapRef) return;

    if (fitPoints.length === 0) {
      const view = companyDefaultView ?? DEFAULT_VIEW;
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
  }, [mapRef, fitPoints, route, mode, companyDefaultView]);

  if (coordinatesUnavailable) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
        Trip coordinates are not available for this booking.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {waitingForGps && (
        <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
          <p className="rounded-md border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
            Waiting for driver GPS
          </p>
        </div>
      )}

      <MapGL
        ref={setMapRef}
        mapboxAccessToken={token}
        initialViewState={initialViewState}
        mapStyle={mapStyle}
        style={{ width: "100%", height: "100%" }}>
        <NavigationControl position="top-right" />
        {route && (
          <Source key={trip.id} id="dispatch-route" type="geojson" data={route}>
            <Layer
              id="dispatch-route-line"
              type="line"
              paint={{
                "line-color": "#2563eb",
                "line-width": 4,
                "line-opacity": 0.85
              }}
              layout={{
                "line-cap": "round",
                "line-join": "round"
              }}
            />
          </Source>
        )}

        {mode === "overview" && (
          <>
            <Marker longitude={trip.pickup.longitude} latitude={trip.pickup.latitude} anchor="bottom">
              <MapPinIcon className="size-7 text-green-600 drop-shadow" />
            </Marker>
            <Marker longitude={trip.dropoff.longitude} latitude={trip.dropoff.latitude} anchor="bottom">
              <MapPinIcon
                className={cn("size-7 drop-shadow", routeError ? "text-red-500" : "text-red-600")}
              />
            </Marker>
          </>
        )}

        {mode === "to_pickup" && pickupValid && (
          <Marker longitude={trip.pickup.longitude} latitude={trip.pickup.latitude} anchor="bottom">
            <MapPinIcon className="size-7 text-green-600 drop-shadow" />
          </Marker>
        )}

        {mode === "to_dropoff" && dropoffValid && (
          <Marker longitude={trip.dropoff.longitude} latitude={trip.dropoff.latitude} anchor="bottom">
            <MapPinIcon
              className={cn("size-7 drop-shadow", routeError ? "text-red-500" : "text-red-600")}
            />
          </Marker>
        )}

        {driverLocation && mode !== "overview" && (
          <AnimatedDriverMarker
            location={driverLocation}
            title={driverName ?? "Driver"}
            vehicleMake={trip.vehicleSnapshot?.make}
          />
        )}
      </MapGL>
    </div>
  );
}
