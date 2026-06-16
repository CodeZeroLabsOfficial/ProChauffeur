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

export const TRIP_TYPES = ["transfer", "hourly", "round_trip"] as const;
export type TripType = (typeof TRIP_TYPES)[number];

export const tripTypeTitle: Record<TripType, string> = {
  transfer: "Point-to-Point",
  hourly: "Hourly",
  round_trip: "Round trip"
};

/** Admin booking form modes (round trip creates two transfer legs). */
export const BOOKING_TRIP_MODES = ["point_to_point", "round_trip", "hourly"] as const;
export type BookingTripMode = (typeof BOOKING_TRIP_MODES)[number];

export const bookingTripModeTitle: Record<BookingTripMode, string> = {
  point_to_point: "Point-to-Point",
  round_trip: "Round trip",
  hourly: "Hourly"
};

/** Trip type used for quoting, eligibility, and persisted trip documents. */
export function quoteTripTypeForBookingMode(mode: BookingTripMode): TripType {
  return mode === "hourly" ? "hourly" : "transfer";
}

// VehicleType.swift — raw values align with Firestore pricing tier keys.
export const VEHICLE_TYPES = ["sedan", "suv", "stretch_limo", "sprinter_van"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const vehicleTypeTitle: Record<VehicleType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  stretch_limo: "Stretch Limo",
  sprinter_van: "Sprinter Van"
};

export const WEEKDAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7] as const;
export type WeekdayNumber = (typeof WEEKDAY_NUMBERS)[number];

export const DISTANCE_UNITS = ["km", "mile"] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

export const distanceUnitTitle: Record<DistanceUnit, string> = {
  km: "Kilometres",
  mile: "Miles"
};

export const TAX_DISPLAY_MODES = ["exclusive", "inclusive"] as const;
export type TaxDisplayMode = (typeof TAX_DISPLAY_MODES)[number];

export const taxDisplayModeTitle: Record<TaxDisplayMode, string> = {
  exclusive: "Exclusive (tax added at checkout)",
  inclusive: "Inclusive (tax included in price)"
};

export const ZONE_MATCH_TYPES = ["postcode", "radius", "polygon"] as const;
export type ZoneMatchType = (typeof ZONE_MATCH_TYPES)[number];

export const PRICING_RULE_TYPES = ["peak_hours", "holiday", "date_range"] as const;
export type PricingRuleType = (typeof PRICING_RULE_TYPES)[number];

export const QUOTE_ROUNDING = ["none", "dollar", "half_dollar"] as const;
export type QuoteRounding = (typeof QUOTE_ROUNDING)[number];

export const QUOTE_LINE_CATEGORIES = [
  "base",
  "distance",
  "deadhead",
  "hourly",
  "minimum",
  "zone_fixed",
  "zone_surcharge",
  "time_adjustment",
  "addon",
  "discount",
  "tax",
  "adjustment"
] as const;
export type QuoteLineCategory = (typeof QUOTE_LINE_CATEGORIES)[number];

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

export const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "paid",
  "failed",
  "invoiced",
  "refunded"
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const paymentStatusTitle: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  invoiced: "Invoiced",
  refunded: "Refunded"
};

export const PAYMENT_SOURCES = ["ios", "web", "stripe"] as const;
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];

export const paymentSourceTitle: Record<PaymentSource, string> = {
  ios: "iOS app",
  web: "Web portal",
  stripe: "Stripe"
};
