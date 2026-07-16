"use client";

import { useEffect, useMemo, useState } from "react";
import MapGL, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/mapbox";
import { useTheme } from "next-themes";
import { MapPinIcon } from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

import { circlePolygonGeoJson, zoomForRadiusKm } from "@/lib/geo/circle-polygon";
import { getMapboxToken } from "@/lib/env";
import { hasValidCoordinate } from "@/lib/mapbox/coordinates";
import type { CoordinateField } from "@/lib/models/trip";

export function ServiceAreaRadiusMap({
  center,
  radiusKm
}: {
  center: CoordinateField | null;
  radiusKm: number;
}) {
  const { resolvedTheme } = useTheme();
  const [mapRef, setMapRef] = useState<MapRef | null>(null);

  let token = "";
  let tokenError = false;
  try {
    token = getMapboxToken();
  } catch {
    tokenError = true;
  }

  const coordinatesValid = center != null && hasValidCoordinate(center);
  const radiusMeters = Math.max(0, radiusKm * 1000);

  const circleFeature = useMemo(() => {
    if (!coordinatesValid || radiusMeters <= 0) return null;
    return circlePolygonGeoJson(center!, radiusMeters);
  }, [center, coordinatesValid, radiusMeters]);

  const initialViewState = useMemo(() => {
    if (!coordinatesValid) {
      return { longitude: 151.2093, latitude: -33.8688, zoom: 10 };
    }
    return {
      longitude: center!.longitude,
      latitude: center!.latitude,
      zoom: zoomForRadiusKm(radiusKm)
    };
  }, [center, coordinatesValid, radiusKm]);

  const mapStyle =
    resolvedTheme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";

  useEffect(() => {
    if (!mapRef || !coordinatesValid) return;
    mapRef.flyTo({
      center: [center!.longitude, center!.latitude],
      zoom: zoomForRadiusKm(radiusKm),
      duration: 400
    });
  }, [mapRef, center, coordinatesValid, radiusKm]);

  return (
    <div className="h-[220px] overflow-hidden rounded-lg border">
      {tokenError ? (
        <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-center text-sm">
          Set NEXT_PUBLIC_MAPBOX_TOKEN to preview the service area.
        </div>
      ) : !coordinatesValid ? (
        <div className="text-muted-foreground flex h-full items-center justify-center p-4 text-center text-sm">
          Select a center address to preview the service area.
        </div>
      ) : (
        <MapGL
          ref={setMapRef}
          mapboxAccessToken={token}
          initialViewState={initialViewState}
          mapStyle={mapStyle}
          style={{ width: "100%", height: "100%" }}
          attributionControl={false}
          scrollZoom={false}
          dragRotate={false}
          pitchWithRotate={false}>
          <NavigationControl position="top-right" showCompass={false} />
          {circleFeature ? (
            <Source id="service-area-circle" type="geojson" data={circleFeature}>
              <Layer
                id="service-area-circle-fill"
                type="fill"
                paint={{
                  "fill-color": "#2563eb",
                  "fill-opacity": 0.15
                }}
              />
              <Layer
                id="service-area-circle-outline"
                type="line"
                paint={{
                  "line-color": "#2563eb",
                  "line-width": 2,
                  "line-opacity": 0.7
                }}
              />
            </Source>
          ) : null}
          <Marker longitude={center!.longitude} latitude={center!.latitude} anchor="bottom">
            <MapPinIcon className="size-7 text-blue-600 drop-shadow" />
          </Marker>
        </MapGL>
      )}
    </div>
  );
}
