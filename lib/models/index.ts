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
export * from "@/lib/models/notification";
export * from "@/lib/models/vehicle-class";
export * from "@/lib/models/branding";

/** Firestore collection names (mirror the iOS `collectionName` constants). */
export const Collections = {
  users: "users",
  trips: "trips",
  vehicles: "vehicles",
  locations: "locations",
  invoices: "invoices",
  operator: "operator",
  appSettings: "app_settings",
  notifications: "notifications",
  vehicleClasses: "vehicle_classes"
} as const;

/** `operator` collection document ids. */
export const OperatorDocs = {
  company: "company",
  locale: "locale",
  operatingHours: "operating_hours",
  pricing: "pricing"
} as const;

/** `app_settings` document ids. */
export const AppSettingsDocs = {
  limits: "limits",
  /** Firestore doc id remains `branding` for backwards compatibility. */
  appearance: "branding",
  /** @deprecated Use `appearance` */
  branding: "branding",
  integrations: "integrations"
} as const;

/** RTDB path for ephemeral live driver/vehicle positions. */
export const rtdbLiveLocationsPath = "liveLocations";
