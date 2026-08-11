import type { PaymentSource, PaymentStatus, TripStatus, TripType } from "@/lib/models/enums";
import type { PricingAddon } from "@/lib/models/pricing";
import type { QuoteLineItem, TripQuoteSnapshot } from "@/lib/models/quote";
import type { VehicleClassCapacity } from "@/lib/models/vehicle-class";
import type { Vehicle } from "@/lib/models/vehicle";

export const TRIP_APPROVAL_STATUSES = [
  "not_required",
  "pending",
  "approved",
  "declined"
] as const;
export type TripApprovalStatus = (typeof TRIP_APPROVAL_STATUSES)[number];

/** CoordinateField.swift — plain lat/lng pair used for pickup/dropoff. */
export interface CoordinateField {
  latitude: number;
  longitude: number;
}

/** Customer snapshot nested on the trip at booking time. */
export interface TripCustomer {
  displayName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  company?: string | null;
}

/** Assigned chauffeur contact snapshot, written at claim time. */
export interface TripDriver {
  displayName?: string | null;
  phoneNumber?: string | null;
  photoURL?: string | null;
}

/** Booking party size — same shape as `VehicleClassCapacity`. */
export type TripCapacity = VehicleClassCapacity;

/** Journey / itinerary fields for the passenger trip. */
export interface TripJourney {
  pickup: CoordinateField;
  dropoff: CoordinateField;
  pickupAddressLine?: string | null;
  dropoffAddressLine?: string | null;
  notes?: string | null;
  bookingAddons?: PricingAddon[] | null;
  scheduledPickupAt?: Date | null;
  linkedTripID?: string | null;
  /** When the passenger trip started (`in_progress`). */
  journeyStartedAt?: Date | null;
  /** When the passenger trip finished (`completed`). */
  journeyCompletedAt?: Date | null;
  /** In-vehicle duration in seconds, set at completion when start is known. */
  journeyDurationSeconds?: number | null;
  /** Onboard distance in meters, written at completion. */
  onboardDistanceMeters?: number | null;
  tripType?: TripType | null;
  bookedHours?: number | null;
}

/** Quote totals and audit snapshot taken at booking / payment time. */
export interface TripQuote {
  vehicleClassId?: string | null;
  vehicleClassDisplayName?: string | null;
  quotedSubtotal?: number | null;
  quotedTaxAmount?: number | null;
  quotedTotal?: number | null;
  quotedCurrencyCode?: string | null;
  quotedTaxRate?: number | null;
  quotedPricesIncludeTax?: boolean | null;
  quoteBreakdown?: QuoteLineItem[] | null;
  quoteComputedAt?: Date | null;
  quoteSnapshot?: TripQuoteSnapshot | null;
  appliedPromoId?: string | null;
  promoCode?: string | null;
}

/** Payment, invoice, and approval fields. */
export interface TripBilling {
  paymentStatus?: PaymentStatus | null;
  paymentSource?: PaymentSource | null;
  stripePaymentIntentId?: string | null;
  invoiceId?: string | null;
  /** Corporate account billed when payment is on-account (or rates applied). */
  corporateAccountId?: string | null;
  /**
   * Reserved for account-manager credit-limit approval (customer portal).
   * Not enforced in the dashboard yet.
   */
  approvalStatus?: TripApprovalStatus | null;
  approvedAt?: Date | null;
  approvedByUserId?: string | null;
  approvalNote?: string | null;
  paidAt?: Date | null;
}

/** Assigned fleet plate snapshot. */
export interface TripVehicle {
  vehicleDocumentId?: string | null;
  vehicleSnapshot?: Vehicle | null;
}

/**
 * Trip document at `branches/{branchId}/trips/{id}`.
 * Nested maps hold booking detail; top-level keeps identity / query fields.
 */
export interface Trip {
  id: string;
  status: TripStatus;
  customerID: string;
  driverID?: string | null;
  /** Location id this trip is stored under (`branches/{branchId}/trips/{id}`). */
  branchId?: string | null;
  customer: TripCustomer;
  driver: TripDriver;
  capacity: TripCapacity;
  journey: TripJourney;
  quote: TripQuote;
  billing: TripBilling;
  vehicle: TripVehicle;
  createdAt: Date;
  updatedAt: Date;
}

export function emptyTripCapacity(): TripCapacity {
  return {
    passengerCount: 1,
    luggage: { smallCount: 0, largeCount: 0 }
  };
}

export function emptyTripCustomer(): TripCustomer {
  return {};
}

export function emptyTripDriver(): TripDriver {
  return {};
}

export function emptyTripQuote(): TripQuote {
  return {};
}

export function emptyTripBilling(): TripBilling {
  return {};
}

export function emptyTripVehicle(): TripVehicle {
  return {};
}

/** Effective pickup instant for list/summary UI. */
export function tripPickupReferenceDate(trip: Trip): Date {
  return trip.journey.scheduledPickupAt ?? trip.createdAt;
}

/** Human-readable in-vehicle journey duration (`in_progress` → `completed`). */
export function formatJourneyDuration(from: Date, to: Date): string {
  const minutes = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return rem ? `${hours} hr ${rem} min` : `${hours} hr`;
  const days = Math.floor(hours / 24);
  const dayHours = hours % 24;
  return dayHours ? `${days} d ${dayHours} hr` : `${days} d`;
}

export function isRoundTripLeg(trip: Trip): boolean {
  return Boolean(trip.journey.linkedTripID);
}

/** Outbound leg has the earlier scheduled pickup when linked to a return leg. */
export function roundTripLegLabel(
  trip: Trip,
  linkedTrip: Trip | null
): "outbound" | "return" | null {
  if (!trip.journey.linkedTripID || !linkedTrip) return null;
  const thisPickup = tripPickupReferenceDate(trip).getTime();
  const linkedPickup = tripPickupReferenceDate(linkedTrip).getTime();
  return thisPickup <= linkedPickup ? "outbound" : "return";
}

export function tripJourneyTimeLabel(trip: Trip): string {
  const started = trip.journey.journeyStartedAt;
  const completed = trip.journey.journeyCompletedAt;
  if (started && completed) {
    return formatJourneyDuration(started, completed);
  }
  const durationSeconds = trip.journey.journeyDurationSeconds;
  if (durationSeconds != null && durationSeconds > 0) {
    const minutes = Math.max(1, Math.round(durationSeconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem ? `${hours} hr ${rem} min` : `${hours} hr`;
  }
  return "—";
}

/** Human-readable onboard distance in km (written at completion). */
export function tripOnboardDistanceLabel(trip: Trip): string {
  const meters = trip.journey.onboardDistanceMeters;
  if (meters == null || !Number.isFinite(meters) || meters < 0) return "—";
  return `${(meters / 1000).toFixed(1)} km`;
}
