import type { DriverProfile } from "@/lib/models/user";

/** Subcollections under `branches/{branchId}/`. */
export const BRANCH_SUBCOLLECTIONS = [
  "settings",
  "trips",
  "vehicles",
  "locations",
  "vehicle_classes",
  "invoices",
  "drivers"
] as const;

export type BranchSubcollection = (typeof BRANCH_SUBCOLLECTIONS)[number];

/** Doc ids under `branches/{branchId}/settings/{docId}`. */
export const BranchSettingsDocs = {
  operatingHours: "operating_hours",
  pricing: "pricing",
  locale: "locale"
} as const;

export type BranchSettingsDocId = (typeof BranchSettingsDocs)[keyof typeof BranchSettingsDocs];

/** `branches/{id}` document. */
export interface Branch {
  id: string;
  name: string;
  isActive: boolean;
  /** Optional square image for location profile / sheet hero. */
  imageUrl?: string | null;
  /** Office / operates-from address for deadhead and map centering. */
  officeAddressLine?: string | null;
  officeLatitude?: number | null;
  officeLongitude?: number | null;
  officePhone?: string | null;
  /** Office / location contact email. */
  officeEmail?: string | null;
  /** Team admin `users/{uid}` with `role: "admin"`. */
  contactUserId?: string | null;
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
  /** Location switch; company license must also allow Auto-Dispatch. Default off. */
  autoDispatchEnabled: boolean;
  /** Location switch; company license must also allow dynamic pricing. Default off. */
  dynamicPricingEnabled: boolean;
  /** Location switch; company license must also allow booking validation. Default off. */
  bookingValidationEnabled: boolean;
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
    imageUrl: null,
    officeAddressLine: null,
    officeLatitude: null,
    officeLongitude: null,
    officePhone: null,
    officeEmail: null,
    contactUserId: null,
    serviceArea: null,
    autoDispatchEnabled: false,
    dynamicPricingEnabled: false,
    bookingValidationEnabled: false,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}
