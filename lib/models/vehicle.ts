import type { VehicleType } from "@/lib/models/enums";

/** VehicleSpecificationChip.swift */
export interface VehicleSpecificationChip {
  id: string;
  systemImageName: string;
  title: string;
  value: string;
}

/** VehicleCarFeatureRow.swift */
export interface VehicleCarFeatureRow {
  id: string;
  label: string;
  value: string;
}

/**
 * Vehicle.swift — `vehicles/{driverID}` document.
 * The document id always equals `driverID` (the chauffeur user id).
 */
export interface Vehicle {
  driverID: string;
  assignedChauffeurUserId?: string | null;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  passengerCapacity: number;
  manufactureYear?: number | null;
  registrationJurisdictionCode?: string | null;
  registrationExpiry?: Date | null;
  pricingVehicleType?: VehicleType | null;
  /** VIN or internal fleet vehicle identifier. */
  vehicleIdentificationNumber?: string | null;
  /** e.g. Petrol, Diesel, Electric, Hybrid. */
  engineTypeDescription?: string | null;
  specificationChips: VehicleSpecificationChip[];
  carFeatureRows: VehicleCarFeatureRow[];
  luggageDescription: string;
  fleetSmallLuggageCount: number;
  fleetLargeLuggageCount: number;
  wifiServiceDescription: string;
  serviceClassDescription: string;
  interiorDescription: string;
  climateControlDescription: string;
  gearTypeDescription: string;
}

/** "Colour Make Model" display string (matches Vehicle.displayName). */
export function vehicleDisplayName(v: Pick<Vehicle, "color" | "make" | "model">): string {
  return `${v.color} ${v.make} ${v.model}`.trim();
}

/** Resolves the chauffeur linked to a fleet row (mirrors effectiveChauffeurUserId). */
export function effectiveChauffeurUserId(v: Vehicle): string | null {
  if (v.assignedChauffeurUserId != null) {
    return v.assignedChauffeurUserId === "" ? null : v.assignedChauffeurUserId;
  }
  return v.driverID;
}

export function luggageSpecificationLabel(small: number, large: number): string {
  const s = Math.max(0, Math.min(12, small));
  const l = Math.max(0, Math.min(12, large));
  if (s === 0 && l === 0) return "No luggage";
  const parts: string[] = [];
  if (s > 0) parts.push(s === 1 ? "1 small" : `${s} small`);
  if (l > 0) parts.push(l === 1 ? "1 large" : `${l} large`);
  return parts.join(", ");
}
