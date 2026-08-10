"use client";

import { useMemo, useState } from "react";
import MapGL, { Layer, NavigationControl, Source, type MapRef } from "react-map-gl/mapbox";

import { AnimatedDriverMarker } from "@/app/dashboard/dispatch/animated-driver-marker";
import { DispatchMapPin } from "@/components/dispatch-map-pin";
import { DispatchStopMarker } from "@/components/dispatch-stop-marker";
import type { DriverLiveLocation } from "@/hooks/use-live-locations";
import { useDispatchMapFit } from "@/hooks/use-dispatch-map-fit";
import { useLiveTripMapFit } from "@/hooks/use-live-trip-map-fit";
import { useMapboxRoute } from "@/hooks/use-mapbox-route";
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
  const { pickup: tripPickup, dropoff: tripDropoff } = trip.journey;

  const driverCoordinate = useMemo(
    () =>
      driverLocation
        ? coordinateFromLatLng(driverLocation.lat, driverLocation.lng)
        : null,
    [driverLocation?.lat, driverLocation?.lng]
  );

  const overviewValid = hasValidCoordinate(tripPickup) && hasValidCoordinate(tripDropoff);
  const pickupValid = hasValidCoordinate(tripPickup);
  const dropoffValid = hasValidCoordinate(tripDropoff);
  const destination = mode === "to_pickup" ? tripPickup : tripDropoff;

  const routeFrom = mode === "overview" ? tripPickup : driverCoordinate;
  const routeTo = mode === "overview" ? tripDropoff : destination;
  const routeEnabled =
    mode === "overview"
      ? overviewValid
      : Boolean(driverCoordinate) &&
        (mode === "to_pickup" ? pickupValid : dropoffValid);

  const { route } = useMapboxRoute(routeFrom, routeTo, token, routeEnabled, {
    debounceMs: mode === "overview" ? 0 : 1000,
    resetKey: `${trip.id}-${mode}`,
    // Match iOS live tracking: traffic-aware while en route / in progress.
    trafficAware: mode === "to_pickup" || mode === "to_dropoff"
  });

  const fitBBox = useMemo((): LngLatBBox | null => {
    let bbox: LngLatBBox | null = null;
    if (mode === "overview" && overviewValid) {
      bbox = includeCoordinate(bbox, tripPickup);
      bbox = includeCoordinate(bbox, tripDropoff);
    } else if (mode === "to_pickup" && pickupValid) {
      bbox = includeCoordinate(bbox, driverCoordinate);
      bbox = includeCoordinate(bbox, tripPickup);
    } else if (mode === "to_dropoff" && dropoffValid) {
      bbox = includeCoordinate(bbox, driverCoordinate);
      bbox = includeCoordinate(bbox, tripDropoff);
    }
    return includeLngLatPairs(bbox, route?.geometry.coordinates);
  }, [
    mode,
    overviewValid,
    pickupValid,
    dropoffValid,
    tripPickup,
    tripDropoff,
    driverCoordinate,
    route
  ]);

  const isLiveTracking =
    (mode === "to_pickup" || mode === "to_dropoff") && Boolean(driverCoordinate);
  const liveDestination =
    mode === "to_pickup" ? tripPickup : mode === "to_dropoff" ? tripDropoff : null;
  const mapFitResetKey = `${trip.id}-${mode}`;
  const routeFlushKey = route?.geometry.coordinates?.length ? "route" : "";

  useDispatchMapFit({
    map: isLiveTracking ? null : mapRef,
    bbox: fitBBox,
    fallbackView,
    resetKey: mapFitResetKey,
    flushKey: routeFlushKey
  });

  useLiveTripMapFit({
    map: mapRef,
    enabled: isLiveTracking,
    bbox: fitBBox,
    driverLat: driverCoordinate?.latitude ?? null,
    driverLng: driverCoordinate?.longitude ?? null,
    destLat: liveDestination?.latitude ?? null,
    destLng: liveDestination?.longitude ?? null,
    hasRoute: Boolean(route?.geometry.coordinates?.length),
    fallbackView,
    resetKey: mapFitResetKey,
    flushKey: routeFlushKey
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

        {(mode === "overview" || mode === "to_pickup") && (
          <DispatchStopMarker longitude={tripPickup.longitude} latitude={tripPickup.latitude}>
            <DispatchMapPin variant="pickup" />
          </DispatchStopMarker>
        )}

        {(mode === "overview" || mode === "to_dropoff") && (
          <DispatchStopMarker longitude={tripDropoff.longitude} latitude={tripDropoff.latitude}>
            <DispatchMapPin variant="dropoff" />
          </DispatchStopMarker>
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
