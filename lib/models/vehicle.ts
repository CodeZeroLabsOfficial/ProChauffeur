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

export interface VehicleLuggageCapacity {
  smallCount: number;
  largeCount: number;
}

export interface VehicleCapacity {
  passengerCount: number;
  luggage: VehicleLuggageCapacity;
}

export interface VehicleSpecifications {
  engineType: string | null;
  transmission: string;
  wifi: string;
  interior: string;
  climateControl: string;
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
  capacity?: VehicleCapacity | null;
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

export function emptyVehicleCapacity(): VehicleCapacity {
  return {
    passengerCount: 4,
    luggage: { smallCount: 0, largeCount: 2 }
  };
}

export function emptyVehicleSpecifications(): VehicleSpecifications {
  return {
    engineType: null,
    transmission: "",
    wifi: "Complimentary",
    interior: "",
    climateControl: ""
  };
}
