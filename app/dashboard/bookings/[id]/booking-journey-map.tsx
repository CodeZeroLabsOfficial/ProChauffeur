"use client";

import { useEffect, useMemo, useState } from "react";
import MapGL, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/mapbox";
import { useTheme } from "next-themes";
import { MapPinIcon } from "lucide-react";
import type { Feature, LineString } from "geojson";

import "mapbox-gl/dist/mapbox-gl.css";

import { getMapboxToken } from "@/lib/env";
import type { CoordinateField } from "@/lib/models/trip";
import { cn } from "@/lib/utils";

type RouteFeature = Feature<LineString>;

function hasValidCoordinate(coordinate: CoordinateField) {
  return coordinate.latitude !== 0 || coordinate.longitude !== 0;
}

function boundsFromCoordinates(pickup: CoordinateField, dropoff: CoordinateField) {
  const lngs = [pickup.longitude, dropoff.longitude];
  const lats = [pickup.latitude, dropoff.latitude];
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)]
  ] as [[number, number], [number, number]];
}

function centerFromCoordinates(pickup: CoordinateField, dropoff: CoordinateField) {
  return {
    longitude: (pickup.longitude + dropoff.longitude) / 2,
    latitude: (pickup.latitude + dropoff.latitude) / 2,
    zoom: 11
  };
}

export function BookingJourneyMap({
  pickup,
  dropoff,
  pickupLabel,
  dropoffLabel
}: {
  pickup: CoordinateField;
  dropoff: CoordinateField;
  pickupLabel?: string | null;
  dropoffLabel?: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const [mapRef, setMapRef] = useState<MapRef | null>(null);
  const [route, setRoute] = useState<RouteFeature | null>(null);
  const [routeError, setRouteError] = useState(false);

  let token = "";
  let tokenError = false;
  try {
    token = getMapboxToken();
  } catch {
    tokenError = true;
  }

  const coordinatesValid = hasValidCoordinate(pickup) && hasValidCoordinate(dropoff);
  const initialViewState = useMemo(
    () => centerFromCoordinates(pickup, dropoff),
    [pickup, dropoff]
  );

  const mapStyle =
    resolvedTheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";

  useEffect(() => {
    if (!token || !coordinatesValid) return;

    let cancelled = false;

    async function loadRoute() {
      setRouteError(false);
      const url = new URL(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}`
      );
      url.searchParams.set("geometries", "geojson");
      url.searchParams.set("overview", "full");
      url.searchParams.set("access_token", token);

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Directions request failed");
        const data = (await res.json()) as {
          routes?: Array<{ geometry: LineString }>;
        };
        const geometry = data.routes?.[0]?.geometry;
        if (!geometry || cancelled) return;
        setRoute({
          type: "Feature",
          properties: {},
          geometry
        });
      } catch {
        if (!cancelled) {
          setRoute(null);
          setRouteError(true);
        }
      }
    }

    void loadRoute();
    return () => {
      cancelled = true;
    };
  }, [pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude, token, coordinatesValid]);

  useEffect(() => {
    if (!mapRef || !coordinatesValid) return;
    mapRef.fitBounds(boundsFromCoordinates(pickup, dropoff), {
      padding: 48,
      duration: 500
    });
  }, [mapRef, pickup, dropoff, coordinatesValid, route]);

  return (
    <div className="space-y-4">
      {(pickupLabel || dropoffLabel) && (
        <div className="space-y-1 text-sm">
          {pickupLabel && (
            <p className="text-muted-foreground flex items-start gap-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-green-600" />
              <span>
                <span className="text-foreground font-medium">Pickup:</span> {pickupLabel}
              </span>
            </p>
          )}
          {dropoffLabel && (
            <p className="text-muted-foreground flex items-start gap-2">
              <MapPinIcon className="mt-0.5 size-4 shrink-0 text-red-500" />
              <span>
                <span className="text-foreground font-medium">Drop-off:</span> {dropoffLabel}
              </span>
            </p>
          )}
        </div>
      )}

      <div className="h-[320px] overflow-hidden rounded-lg border">
        {tokenError ? (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
            Set NEXT_PUBLIC_MAPBOX_TOKEN to show the journey map.
          </div>
        ) : !coordinatesValid ? (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
            Pickup and drop-off coordinates are not available for this booking.
          </div>
        ) : (
          <MapGL
            ref={setMapRef}
            mapboxAccessToken={token}
            initialViewState={initialViewState}
            mapStyle={mapStyle}
            style={{ width: "100%", height: "100%" }}
            attributionControl={false}>
            <NavigationControl position="top-right" />
            {route && (
              <Source id="journey-route" type="geojson" data={route}>
                <Layer
                  id="journey-route-line"
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
            <Marker longitude={pickup.longitude} latitude={pickup.latitude} anchor="bottom">
              <MapPinIcon className="size-7 text-green-600 drop-shadow" />
            </Marker>
            <Marker longitude={dropoff.longitude} latitude={dropoff.latitude} anchor="bottom">
              <MapPinIcon className={cn("size-7 drop-shadow", routeError ? "text-red-500" : "text-red-600")} />
            </Marker>
          </MapGL>
        )}
      </div>
      {routeError && coordinatesValid && !tokenError && (
        <p className="text-muted-foreground text-xs">
          Could not load driving directions. Showing pickup and drop-off only.
        </p>
      )}
    </div>
  );
}
