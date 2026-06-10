import type { CoordinateField } from "@/lib/models/trip";

export type RouteMetrics = { distanceMeters: number; durationSeconds: number };

const MAX_ENTRIES = 128;
const cache = new Map<string, RouteMetrics>();
const keyOrder: string[] = [];

function cacheKey(from: CoordinateField, to: CoordinateField): string {
  return `${from.latitude.toFixed(6)},${from.longitude.toFixed(6)}->${to.latitude.toFixed(6)},${to.longitude.toFixed(6)}`;
}

export function getCachedRouteMetrics(
  from: CoordinateField,
  to: CoordinateField
): RouteMetrics | undefined {
  return cache.get(cacheKey(from, to));
}

export function setCachedRouteMetrics(
  from: CoordinateField,
  to: CoordinateField,
  metrics: RouteMetrics
): void {
  const key = cacheKey(from, to);
  if (cache.has(key)) return;
  cache.set(key, metrics);
  keyOrder.push(key);
  if (keyOrder.length > MAX_ENTRIES) {
    const oldest = keyOrder.shift();
    if (oldest) cache.delete(oldest);
  }
}
