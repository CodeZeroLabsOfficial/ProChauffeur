import type { DriverProfile } from "@/lib/models/user";

/** Fallback Location id when none is selected or resolved. */
export const DEFAULT_BRANCH_ID = "brisbane";

/** Subcollections under `branches/{branchId}/`. */
export const BRANCH_SUBCOLLECTIONS = [
  "settings",
  "trips",
  "vehicles",
  "locations",
  "vehicle_classes",
  "invoices",
  "drivers",
  "notifications"
] as const;

export type BranchSubcollection = (typeof BRANCH_SUBCOLLECTIONS)[number];

/** Doc ids under `branches/{branchId}/settings/{docId}`. */
export const BranchSettingsDocs = {
  operatingHours: "operating_hours",
  pricing: "pricing"
} as const;

export type BranchSettingsDocId = (typeof BranchSettingsDocs)[keyof typeof BranchSettingsDocs];

/** `branches/{id}` document. */
export interface Branch {
  id: string;
  name: string;
  isActive: boolean;
  timeZoneIdentifier?: string | null;
  /** Optional square image for location profile / sheet hero. */
  imageUrl?: string | null;
  /** Office / operates-from address (replaces Garage in product UI). */
  officeAddressLine?: string | null;
  officeLatitude?: number | null;
  officeLongitude?: number | null;
  officePhone?: string | null;
  /** Optional service-area description for booking resolve. */
  serviceArea?: {
    type: "postcodes" | "radius" | "polygon";
    postcodes?: string[];
    centerLatitude?: number;
    centerLongitude?: number;
    centerAddressLine?: string | null;
    radiusMeters?: number;
    polygon?: { latitude: number; longitude: number }[];
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Synced default FleetLocation doc id for quoting deadhead. */
export const BRANCH_OFFICE_FLEET_LOCATION_ID = "office";

/** Chauffeur roster entry — `branches/{branchId}/drivers/{uid}`. */
export interface BranchDriver extends DriverProfile {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Firestore path segments for a branch subcollection. */
export function branchCollectionSegments(
  branchId: string,
  sub: Exclude<BranchSubcollection, "settings">
): [string, string, string] {
  return ["branches", branchId, sub];
}

/** Firestore path segments for a branch settings doc. */
export function branchSettingsSegments(
  branchId: string,
  docId: BranchSettingsDocId
): [string, string, string, string] {
  return ["branches", branchId, "settings", docId];
}

export function buildBranch(
  overrides: Partial<Branch> & Pick<Branch, "id" | "name">
): Branch {
  const now = new Date();
  return {
    isActive: true,
    timeZoneIdentifier: null,
    imageUrl: null,
    officeAddressLine: null,
    officeLatitude: null,
    officeLongitude: null,
    officePhone: null,
    serviceArea: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}
