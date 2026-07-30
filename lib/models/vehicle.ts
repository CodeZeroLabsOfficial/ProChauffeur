import type { VehicleInsurancePolicyType } from "@/lib/vehicle-insurance";

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
  /** CTP insurer or government scheme name. */
  ctpProviderName?: string | null;
  /** CTP policy / Green Slip / reference number. */
  ctpPolicyNumber?: string | null;
  /** CTP class or category (e.g. booked-hire class); varies by jurisdiction. */
  ctpClassOrType?: string | null;
  ctpExpiry?: Date | null;
  /** When true, CTP is commonly bundled with registration. */
  ctpIncludedWithRegistration?: boolean | null;
  /** Optional vehicle insurance policy type (not CTP). */
  insurancePolicyType?: VehicleInsurancePolicyType | null;
  insuranceProviderName?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiry?: Date | null;
  roadworthyCertificateNumber?: string | null;
  roadworthyIssuingAuthority?: string | null;
  roadworthyExpiry?: Date | null;
  vehicleClassId?: string | null;
  /** VIN or internal fleet vehicle identifier. */
  vehicleIdentificationNumber?: string | null;
  /** e.g. Petrol, Diesel, Electric, Hybrid. */
  engineTypeDescription?: string | null;
  luggageDescription: string;
  smallLuggageCount: number;
  largeLuggageCount: number;
  gearTypeDescription: string;
}

/** "Colour Make Model" display string (matches Vehicle.displayName). */
export function vehicleDisplayName(v: Pick<Vehicle, "color" | "make" | "model">): string {
  return `${v.color} ${v.make} ${v.model}`.trim();
}

/** Resolves the chauffeur linked to a fleet row (assignedChauffeurUserId, else driverID). */
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
