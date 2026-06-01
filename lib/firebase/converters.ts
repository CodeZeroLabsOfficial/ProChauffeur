import { GeoPoint, Timestamp, type DocumentData } from "firebase/firestore";

import type { CoordinateField } from "@/lib/models/trip";

/** Firestore Timestamp/Date/number -> JS Date (or null). */
export function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Plain object shape { seconds, nanoseconds } (e.g. from admin SDK serialisation)
  if (typeof value === "object" && value !== null && "seconds" in value) {
    const secs = (value as { seconds: number }).seconds;
    return new Date(secs * 1000);
  }
  return null;
}

/** Firestore GeoPoint / {latitude,longitude} -> CoordinateField (or null). */
export function toCoordinate(value: unknown): CoordinateField | null {
  if (value == null) return null;
  if (value instanceof GeoPoint) {
    return { latitude: value.latitude, longitude: value.longitude };
  }
  if (typeof value === "object" && value !== null && "latitude" in value && "longitude" in value) {
    const v = value as { latitude: number; longitude: number };
    return { latitude: v.latitude, longitude: v.longitude };
  }
  return null;
}

export function coordinateToGeoPoint(c: CoordinateField): GeoPoint {
  return new GeoPoint(c.latitude, c.longitude);
}

/** Coerce a Firestore numeric field to an integer, returning fallback when absent. */
export function toInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? fallback : n;
  }
  return fallback;
}

/** Removes `undefined` values so Firestore `setDoc`/`updateDoc` don't reject them. */
export function stripUndefined<T extends DocumentData>(obj: T): T {
  const out: DocumentData = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
