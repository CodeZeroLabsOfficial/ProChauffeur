export * from "@/lib/models/enums";
export * from "@/lib/models/user";
export * from "@/lib/models/vehicle";
export * from "@/lib/models/trip";
export * from "@/lib/models/location";
export * from "@/lib/models/pricing";
export * from "@/lib/models/quote";
export * from "@/lib/models/operating-hours";
export * from "@/lib/models/license";
export * from "@/lib/models/invoice";
export * from "@/lib/models/company";
export * from "@/lib/models/postal-address";
export * from "@/lib/models/locale";
export * from "@/lib/models/locale-options";
export * from "@/lib/models/driver-licence-presets";
export * from "@/lib/models/notification";
export * from "@/lib/models/vehicle-class";
export * from "@/lib/models/saved-payment-method";
export * from "@/lib/models/workspace";
export * from "@/lib/models/branch";
export * from "@/lib/models/promotion";
export * from "@/lib/models/corporate-account";

/** Firestore collection names. */
export const Collections = {
  users: "users",
  branches: "branches",
  appSettings: "app_settings",
  notifications: "notifications",
  promotions: "promotions",
  corporateAccounts: "corporateAccounts"
} as const;

/** `app_settings` document ids. */
export const AppSettingsDocs = {
  /** Plan, feature overrides, and capacity caps. */
  license: "license",
  /** Plan catalog (planId → included features). */
  plans: "plans",
  /** Appearance settings (workspace name, logo, fonts, primary colour). */
  appearance: "workspace",
  integrations: "integrations",
  company: "company",
  locale: "locale"
} as const;

/** RTDB root for live trip positions (`liveTrips/{branchId}/{tripId}`). */
export const rtdbLiveTripsPath = "liveTrips";

/** RTDB path for one branch's live trip positions. */
export function rtdbBranchLiveTripsPath(branchId: string): string {
  return `${rtdbLiveTripsPath}/${branchId}`;
}

/** RTDB path for one trip's live position. */
export function rtdbLiveTripPath(branchId: string, tripId: string): string {
  return `${rtdbBranchLiveTripsPath(branchId)}/${tripId}`;
}
