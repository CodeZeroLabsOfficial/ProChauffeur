import { fetchRouteMetrics, type RouteMetrics } from "@/lib/mapbox/directions";
import type { CoordinateField } from "@/lib/models/trip";

const QUANTIZE_DP = 4;
const TTL_MS = 20_000;
const MAX_ENTRIES = 128;

type CacheEntry = {
  metrics: RouteMetrics;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const keyOrder: string[] = [];

function quantize(n: number): string {
  return n.toFixed(QUANTIZE_DP);
}

function cacheKey(from: CoordinateField, to: CoordinateField): string {
  return `${quantize(from.latitude)},${quantize(from.longitude)}->${quantize(to.latitude)},${quantize(to.longitude)}`;
}

function touchKey(key: string) {
  const idx = keyOrder.indexOf(key);
  if (idx >= 0) keyOrder.splice(idx, 1);
  keyOrder.push(key);
  while (keyOrder.length > MAX_ENTRIES) {
    const oldest = keyOrder.shift();
    if (oldest) cache.delete(oldest);
  }
}

export function getCachedLiveRouteMetrics(
  from: CoordinateField,
  to: CoordinateField
): RouteMetrics | undefined {
  const key = cacheKey(from, to);
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    const idx = keyOrder.indexOf(key);
    if (idx >= 0) keyOrder.splice(idx, 1);
    return undefined;
  }
  return entry.metrics;
}

export function setCachedLiveRouteMetrics(
  from: CoordinateField,
  to: CoordinateField,
  metrics: RouteMetrics
): void {
  const key = cacheKey(from, to);
  cache.set(key, { metrics, expiresAt: Date.now() + TTL_MS });
  touchKey(key);
}

/** Live GPS → destination route metrics with short TTL + quantized coords. */
export async function fetchLiveRouteMetrics(
  from: CoordinateField,
  to: CoordinateField,
  token: string
): Promise<RouteMetrics | null> {
  const cached = getCachedLiveRouteMetrics(from, to);
  if (cached) return cached;

  const metrics = await fetchRouteMetrics(from, to, token);
  if (metrics) setCachedLiveRouteMetrics(from, to, metrics);
  return metrics;
}
