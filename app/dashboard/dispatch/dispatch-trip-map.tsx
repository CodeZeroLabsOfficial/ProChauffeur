"use client";

import { useMemo, useState } from "react";
import MapGL, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/mapbox";
import { MapPinIcon } from "lucide-react";

import { AnimatedDriverMarker } from "@/app/dashboard/dispatch/animated-driver-marker";
import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import { useMapboxRoute } from "@/hooks/use-mapbox-route";
import { useThrottledMapFit } from "@/hooks/use-throttled-map-fit";
import {
  coordinateFromLatLng,
  hasValidCoordinate,
  includeCoordinate,
  includeLngLatPairs,
  MAP_FALLBACK_VIEW,
  type LngLatBBox,
  type MapViewState
} from "@/lib/mapbox/coordinates";
import { dispatchMapMode } from "@/lib/mapbox/dispatch-map-mode";
import { initialViewFromBBox } from "@/lib/mapbox/fit-map-camera";
import type { Trip } from "@/lib/models/trip";
import { cn } from "@/lib/utils";

export function DispatchTripMap({
  trip,
  driverLocation,
  driverName,
  vehicleMake,
  companyDefaultView,
  token,
  mapStyle
}: {
  trip: Trip;
  driverLocation: DriverLiveLocation | null;
  driverName: string | null;
  vehicleMake?: string | null;
  companyDefaultView: MapViewState | null;
  token: string;
  mapStyle: string;
}) {
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
  const mode = dispatchMapMode(trip.status);
  const fallbackView = companyDefaultView ?? MAP_FALLBACK_VIEW;

  const driverCoordinate = useMemo(
    () =>
      driverLocation
        ? coordinateFromLatLng(driverLocation.lat, driverLocation.lng)
        : null,
    [driverLocation?.lat, driverLocation?.lng]
  );

  const overviewValid = hasValidCoordinate(trip.pickup) && hasValidCoordinate(trip.dropoff);
  const pickupValid = hasValidCoordinate(trip.pickup);
  const dropoffValid = hasValidCoordinate(trip.dropoff);
  const destination = mode === "to_pickup" ? trip.pickup : trip.dropoff;

  const routeFrom = mode === "overview" ? trip.pickup : driverCoordinate;
  const routeTo = mode === "overview" ? trip.dropoff : destination;
  const routeEnabled =
    mode === "overview"
      ? overviewValid
      : Boolean(driverCoordinate) &&
        (mode === "to_pickup" ? pickupValid : dropoffValid);

  const { route, error: routeError } = useMapboxRoute(routeFrom, routeTo, token, routeEnabled, {
    debounceMs: mode === "overview" ? 0 : 1000,
    resetKey: `${trip.id}-${mode}`
  });

  const fitBBox = useMemo((): LngLatBBox | null => {
    let bbox: LngLatBBox | null = null;
    if (mode === "overview" && overviewValid) {
      bbox = includeCoordinate(bbox, trip.pickup);
      bbox = includeCoordinate(bbox, trip.dropoff);
    } else if (mode === "to_pickup" && pickupValid) {
      bbox = includeCoordinate(bbox, driverCoordinate);
      bbox = includeCoordinate(bbox, trip.pickup);
    } else if (mode === "to_dropoff" && dropoffValid) {
      bbox = includeCoordinate(bbox, driverCoordinate);
      bbox = includeCoordinate(bbox, trip.dropoff);
    }
    return includeLngLatPairs(bbox, route?.geometry.coordinates);
  }, [
    mode,
    overviewValid,
    pickupValid,
    dropoffValid,
    trip.pickup,
    trip.dropoff,
    driverCoordinate,
    route
  ]);

  const isLiveTracking =
    (mode === "to_pickup" || mode === "to_dropoff") && Boolean(driverCoordinate);

  useThrottledMapFit({
    map: mapRef,
    bbox: fitBBox,
    fallbackView,
    throttle: isLiveTracking,
    freezeAfterFit: isLiveTracking,
    resetKey: `${trip.id}-${mode}`,
    flushKey: route?.geometry.coordinates?.length ? "route" : ""
  });

  const waitingForGps = (mode === "to_pickup" || mode === "to_dropoff") && !driverCoordinate;

  const coordinatesUnavailable =
    (mode === "overview" && !overviewValid) ||
    (mode === "to_pickup" && !pickupValid) ||
    (mode === "to_dropoff" && !dropoffValid);

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
        initialViewState={initialViewFromBBox(fitBBox, fallbackView)}
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
            <Marker
              longitude={trip.pickup.longitude}
              latitude={trip.pickup.latitude}
              anchor="bottom">
              <MapPinIcon className="size-7 text-green-600 drop-shadow" />
            </Marker>
            <Marker
              longitude={trip.dropoff.longitude}
              latitude={trip.dropoff.latitude}
              anchor="bottom">
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
          <Marker
            longitude={trip.dropoff.longitude}
            latitude={trip.dropoff.latitude}
            anchor="bottom">
            <MapPinIcon
              className={cn("size-7 drop-shadow", routeError ? "text-red-500" : "text-red-600")}
            />
          </Marker>
        )}

        {driverLocation && mode !== "overview" && (
          <AnimatedDriverMarker
            location={driverLocation}
            title={driverName ?? "Driver"}
            vehicleMake={vehicleMake}
          />
        )}
      </MapGL>
    </div>
  );
}
