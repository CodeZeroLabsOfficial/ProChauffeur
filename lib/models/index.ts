export * from "@/lib/models/enums";
export * from "@/lib/models/user";
export * from "@/lib/models/vehicle";
export * from "@/lib/models/trip";
export * from "@/lib/models/location";
export * from "@/lib/models/pricing";
export * from "@/lib/models/quote";
export * from "@/lib/models/operating-hours";
export * from "@/lib/models/limits";
export * from "@/lib/models/invoice";
export * from "@/lib/models/company";
export * from "@/lib/models/postal-address";
export * from "@/lib/models/locale";
export * from "@/lib/models/locale-options";
export * from "@/lib/models/notification";
export * from "@/lib/models/vehicle-class";
export * from "@/lib/models/saved-payment-method";
export * from "@/lib/models/workspace";
export * from "@/lib/models/branch";

/** Firestore collection names. */
export const Collections = {
  users: "users",
  branches: "branches",
  /** @deprecated Legacy top-level path; prefer nested under branches/{branchId}/trips */
  trips: "trips",
  /** @deprecated Legacy top-level path; prefer nested under branches/{branchId}/vehicles */
  vehicles: "vehicles",
  /** @deprecated Legacy top-level path; prefer nested under branches/{branchId}/locations */
  locations: "locations",
  /** @deprecated Legacy top-level path; prefer nested under branches/{branchId}/invoices */
  invoices: "invoices",
  operator: "operator",
  appSettings: "app_settings",
  notifications: "notifications",
  /** @deprecated Legacy top-level path; prefer nested under branches/{branchId}/vehicle_classes */
  vehicleClasses: "vehicle_classes"
} as const;

/**
 * Legacy `operator` collection document ids.
 * @deprecated Prefer `AppSettingsDocs` (company/locale) and `BranchSettingsDocs` (pricing/hours).
 * Kept for migration scripts that still read `operator/{docId}`.
 */
export const OperatorDocs = {
  company: "company",
  locale: "locale"
} as const;

/** `app_settings` document ids. */
export const AppSettingsDocs = {
  limits: "limits",
  /** Appearance settings (workspace name, logo, fonts, primary colour). */
  appearance: "workspace",
  integrations: "integrations",
  company: "company",
  locale: "locale"
} as const;

/** RTDB root for live driver positions (`liveLocations/{branchId}/{driverId}`). */
export const rtdbLiveLocationsPath = "liveLocations";

/** RTDB path for one branch's live positions. */
export function rtdbBranchLiveLocationsPath(branchId: string): string {
  return `${rtdbLiveLocationsPath}/${branchId}`;
}
