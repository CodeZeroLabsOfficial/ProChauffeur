import type { VehicleInsuranceCoverType } from "@/lib/vehicle-insurance";

export interface VehicleRegistration {
  registrationNumber: string;
  jurisdictionCode: string;
  issuingAuthority: string;
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

export interface VehicleDetails {
  make: string;
  model: string;
  color: string;
  manufactureYear: number | null;
  vehicleIdentificationNumber: string | null;
  vehicleClassId: string | null;
}

/** Mechanical specs for a fleet plate (booking inclusions live on VehicleClass). */
export interface VehicleSpecifications {
  engineType: string | null;
  transmission: string;
}

/**
 * Vehicle document at `branches/{branchId}/vehicles/{driverID}`.
 * The document id always equals `driverID` (stable fleet row id).
 */
export interface Vehicle {
  driverID: string;
  assignedChauffeurUserId?: string | null;
  /** Whether this vehicle can be used in fleet operations. Defaults to true. */
  isEnabled?: boolean;
  details?: VehicleDetails | null;
  specifications?: VehicleSpecifications | null;
  registration?: VehicleRegistration | null;
  insurancePolicies?: VehicleInsurancePolicy[];
  roadworthy?: VehicleRoadworthy | null;
}

/** "Colour Make Model" display string. */
export function vehicleDisplayName(
  v: Pick<Vehicle, "details"> | Pick<VehicleDetails, "color" | "make" | "model">
): string {
  if ("details" in v) {
    const d = (v as Pick<Vehicle, "details">).details;
    return `${d?.color ?? ""} ${d?.make ?? ""} ${d?.model ?? ""}`.trim();
  }
  const flat = v as Pick<VehicleDetails, "color" | "make" | "model">;
  return `${flat.color} ${flat.make} ${flat.model}`.trim();
}

export function vehicleRegistrationNumber(v: Pick<Vehicle, "registration">): string {
  return v.registration?.registrationNumber?.trim() || "";
}

/** Resolves the chauffeur linked to a fleet row. Missing or empty is unassigned. */
export function effectiveChauffeurUserId(v: Vehicle): string | null {
  const id = v.assignedChauffeurUserId?.trim();
  return id ? id : null;
}

export function emptyVehicleDetails(): VehicleDetails {
  return {
    make: "",
    model: "",
    color: "",
    manufactureYear: null,
    vehicleIdentificationNumber: null,
    vehicleClassId: null
  };
}

export function emptyVehicleSpecifications(): VehicleSpecifications {
  return {
    engineType: null,
    transmission: ""
  };
}
