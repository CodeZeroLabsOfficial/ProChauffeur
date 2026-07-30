import type { VehicleInsuranceCoverType } from "@/lib/vehicle-insurance";

export interface VehicleRegistration {
  registrationNumber: string;
  jurisdictionCode: string;
  registrationStart: Date | null;
  registrationExpiry: Date | null;
}

export interface VehicleInsurancePolicy {
  id: string;
  coverType: VehicleInsuranceCoverType;
  insurerName: string;
  policyReferenceNumber: string;
  policyStart: Date | null;
  policyExpiry: Date | null;
}

export interface VehicleRoadworthy {
  certificateNumber: string;
  issuingAuthority: string;
  jurisdictionCode: string;
  issueDate: Date | null;
  expiryDate: Date | null;
}

/**
 * Vehicle.swift — `vehicles/{driverID}` document.
 * The document id always equals `driverID` (the chauffeur user id).
 */
export interface Vehicle {
  driverID: string;
  assignedChauffeurUserId?: string | null;
  /** Whether this vehicle can be used in fleet operations. Defaults to true. */
  isEnabled?: boolean;
  make: string;
  model: string;
  color: string;
  passengerCapacity: number;
  manufactureYear?: number | null;
  registration?: VehicleRegistration | null;
  insurancePolicies?: VehicleInsurancePolicy[];
  roadworthy?: VehicleRoadworthy | null;
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

export function vehicleRegistrationNumber(v: Pick<Vehicle, "registration">): string {
  return v.registration?.registrationNumber?.trim() || "";
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
