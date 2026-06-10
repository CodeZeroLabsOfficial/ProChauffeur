import type { Feature, LineString } from "geojson";

import type { CoordinateField } from "@/lib/models/trip";

export type RouteFeature = Feature<LineString>;

export type RouteMetrics = {
  distanceMeters: number;
  durationSeconds: number;
};

export async function fetchRouteMetrics(
  from: CoordinateField,
  to: CoordinateField,
  token: string
): Promise<RouteMetrics | null> {
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
  );
  url.searchParams.set("overview", "false");
  url.searchParams.set("access_token", token);

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    routes?: Array<{ distance: number; duration: number }>;
  };
  const route = data.routes?.[0];
  if (!route) return null;

  return {
    distanceMeters: route.distance,
    durationSeconds: route.duration
  };
}

export async function fetchMapboxDrivingRoute(
  from: CoordinateField,
  to: CoordinateField,
  token: string
): Promise<RouteFeature | null> {
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
  );
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("access_token", token);

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = (await res.json()) as {
    routes?: Array<{ geometry: LineString }>;
  };
  const geometry = data.routes?.[0]?.geometry;
  if (!geometry) return null;

  return {
    type: "Feature",
    properties: {},
    geometry
  };
}
