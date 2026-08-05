import type { Feature, LineString } from "geojson";

import type { CoordinateField } from "@/lib/models/trip";

export type RouteFeature = Feature<LineString>;

export type RouteMetrics = {
  distanceMeters: number;
  durationSeconds: number;
};

/** Opt-in traffic-aware Directions (matches iOS live tracking). */
export type DirectionsTrafficOptions = {
  trafficAware?: boolean;
  /** Used when `trafficAware`; defaults to now. */
  departAt?: Date;
};

function directionsProfileUrl(
  from: CoordinateField,
  to: CoordinateField,
  options?: DirectionsTrafficOptions
): URL {
  const profile = options?.trafficAware ? "driving-traffic" : "driving";
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
  );
  if (options?.trafficAware) {
    const departAt = options.departAt ?? new Date();
    // Mapbox expects ISO 8601 YYYY-MM-DDThh:mm (UTC).
    url.searchParams.set("depart_at", departAt.toISOString().slice(0, 16));
  }
  return url;
}

export async function fetchRouteMetrics(
  from: CoordinateField,
  to: CoordinateField,
  token: string,
  options?: DirectionsTrafficOptions
): Promise<RouteMetrics | null> {
  const url = directionsProfileUrl(from, to, options);
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
  token: string,
  options?: DirectionsTrafficOptions
): Promise<RouteFeature | null> {
  const url = directionsProfileUrl(from, to, options);
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
