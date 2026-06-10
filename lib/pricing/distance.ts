import type { DistanceUnit } from "@/lib/models/enums";

const METERS_PER_KM = 1000;
const METERS_PER_MILE = 1609.344;

export function metersToDistanceUnit(meters: number, unit: DistanceUnit): number {
  if (!Number.isFinite(meters) || meters < 0) return 0;
  return unit === "mile" ? meters / METERS_PER_MILE : meters / METERS_PER_KM;
}

export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit === "mile" ? "mile" : "km";
}
