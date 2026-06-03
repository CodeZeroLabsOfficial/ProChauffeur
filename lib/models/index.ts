export * from "@/lib/models/enums";
export * from "@/lib/models/user";
export * from "@/lib/models/vehicle";
export * from "@/lib/models/trip";
export * from "@/lib/models/location";
export * from "@/lib/models/pricing";
export * from "@/lib/models/operating-hours";
export * from "@/lib/models/limits";
export * from "@/lib/models/invoice";
export * from "@/lib/models/company";

/** Firestore collection names (mirror the iOS `collectionName` constants). */
export const Collections = {
  users: "users",
  trips: "trips",
  vehicles: "vehicles",
  locations: "locations",
  invoices: "invoices",
  operator: "operator",
  appSettings: "app_settings"
} as const;

/** `operator` collection document ids. */
export const OperatorDocs = {
  company: "company"
} as const;

/** `app_settings` document ids. */
export const AppSettingsDocs = {
  pricing: "pricing",
  operatingHours: "operating_hours",
  limits: "limits",
  branding: "branding",
  locale: "locale",
  integrations: "integrations"
} as const;

/** RTDB path for ephemeral live driver/vehicle positions. */
export const rtdbLiveLocationsPath = "liveLocations";
