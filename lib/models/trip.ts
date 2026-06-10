import type { TripStatus, TripType } from "@/lib/models/enums";
import type { PricingAddon } from "@/lib/models/pricing";
import type { QuoteLineItem, TripQuoteSnapshot } from "@/lib/models/quote";
import type { Vehicle } from "@/lib/models/vehicle";

/** CoordinateField.swift — plain lat/lng pair used for pickup/dropoff. */
export interface CoordinateField {
  latitude: number;
  longitude: number;
}

/** Trip.swift — `trips/{id}` document. */
export interface Trip {
  id: string;
  status: TripStatus;
  customerID: string;
  customerDisplayName?: string | null;
  customerPhoneNumber?: string | null;
  customerEmail?: string | null;
  customerStreet?: string | null;
  customerCity?: string | null;
  customerState?: string | null;
  customerPostcode?: string | null;
  customerCountry?: string | null;
  customerCompany?: string | null;
  driverID?: string | null;
  pickup: CoordinateField;
  dropoff: CoordinateField;
  pickupAddressLine?: string | null;
  dropoffAddressLine?: string | null;
  vehicleSnapshot?: Vehicle | null;
  vehicleDocumentId?: string | null;
  notes?: string | null;
  bookingPassengerCount?: number | null;
  bookingSmallLuggageCount?: number | null;
  bookingLargeLuggageCount?: number | null;
  bookingAddons?: PricingAddon[] | null;
  scheduledPickupAt?: Date | null;
  linkedTripID?: string | null;
  /** When the passenger trip started (`in_progress`). */
  journeyStartedAt?: Date | null;
  /** When the passenger trip finished (`completed`). */
  journeyCompletedAt?: Date | null;
  /** In-vehicle duration in seconds, set at completion when start is known. */
  journeyDurationSeconds?: number | null;
  /** Live chauffeur GPS (Firestore GeoPoint -> lat/lng). */
  liveLocation?: CoordinateField | null;
  liveHeadingDegrees?: number | null;
  tripType?: TripType | null;
  vehicleClassId?: string | null;
  vehicleClassDisplayName?: string | null;
  bookedHours?: number | null;
  quotedSubtotal?: number | null;
  quotedTaxAmount?: number | null;
  quotedTotal?: number | null;
  quotedCurrencyCode?: string | null;
  quotedTaxRate?: number | null;
  quotedPricesIncludeTax?: boolean | null;
  quoteBreakdown?: QuoteLineItem[] | null;
  quoteComputedAt?: Date | null;
  quoteSnapshot?: TripQuoteSnapshot | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Effective pickup instant for list/summary UI. */
export function tripPickupReferenceDate(trip: Trip): Date {
  return trip.scheduledPickupAt ?? trip.createdAt;
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

export function tripJourneyTimeLabel(trip: Trip): string {
  if (trip.journeyStartedAt && trip.journeyCompletedAt) {
    return formatJourneyDuration(trip.journeyStartedAt, trip.journeyCompletedAt);
  }
  if (trip.journeyDurationSeconds != null && trip.journeyDurationSeconds > 0) {
    const minutes = Math.max(1, Math.round(trip.journeyDurationSeconds / 60));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    return rem ? `${hours} hr ${rem} min` : `${hours} hr`;
  }
  return "—";
}
