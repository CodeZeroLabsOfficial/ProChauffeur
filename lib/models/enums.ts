/**
 * Enum unions ported 1:1 from the iOS app (raw values must match Firestore).
 */

// UserRole.swift
export const USER_ROLES = ["customer", "driver", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const userRoleTitle: Record<UserRole, string> = {
  customer: "Customer",
  driver: "Driver",
  admin: "Admin"
};

// TripStatus.swift — note snake_case raw values for multi-word cases.
export const TRIP_STATUSES = [
  "requested",
  "accepted",
  "en_route_pickup",
  "in_progress",
  "completed",
  "cancelled"
] as const;
export type TripStatus = (typeof TRIP_STATUSES)[number];

export const tripStatusTitle: Record<TripStatus, string> = {
  requested: "Requested",
  accepted: "Accepted",
  en_route_pickup: "Enroute",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled"
};

export const upcomingTripStatuses: TripStatus[] = [
  "requested",
  "accepted",
  "en_route_pickup",
  "in_progress"
];

// VehicleType.swift — raw values align with Firestore pricing tier keys.
export const VEHICLE_TYPES = ["sedan", "suv", "stretch_limo", "sprinter_van"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const vehicleTypeTitle: Record<VehicleType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  stretch_limo: "Stretch Limo",
  sprinter_van: "Sprinter Van"
};

// ChauffeurCategory (DriverProfile.swift)
export const CHAUFFEUR_CATEGORIES = [
  "leadChauffeur",
  "chauffeur",
  "fleetConcierge",
  "dispatcher",
  "other"
] as const;
export type ChauffeurCategory = (typeof CHAUFFEUR_CATEGORIES)[number];

export const chauffeurCategoryTitle: Record<ChauffeurCategory, string> = {
  leadChauffeur: "Lead chauffeur",
  chauffeur: "Chauffeur",
  fleetConcierge: "Fleet concierge",
  dispatcher: "Dispatcher",
  other: "Other"
};

// Invoice status (web-defined; no iOS equivalent).
export const INVOICE_STATUSES = ["draft", "sent", "paid", "void", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoiceStatusTitle: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
  overdue: "Overdue"
};
