import type { DistanceUnit, QuoteLineCategory, TripType } from "@/lib/models/enums";
import type { CoordinateField } from "@/lib/models/trip";

export interface QuoteLineItem {
  id: string;
  label: string;
  amount: number;
  category: QuoteLineCategory;
  isInternal: boolean;
}

export interface TripQuoteSnapshot {
  schemaVersion: number;
  tripType: TripType;
  vehicleClassId: string;
  garageLocationId: string;
  distanceUnit: DistanceUnit;
  currencyCode: string;
  onboardUnits: number;
  deadheadUnits: number;
  bookedHours: number | null;
  matchedZoneIds: string[];
  appliedFixedZoneId: string | null;
  appliedZoneSurchargeIds: string[];
  appliedRuleId: string | null;
  addonIds: string[];
  appliedPromoId: string | null;
  promoCode: string | null;
  pickupPostcode: string;
  dropoffPostcode: string;
  scheduledPickupAt: Date;
}

/** Resolved promo already validated for this quote (engine stays pure). */
export interface QuotePromoApplication {
  id: string;
  title: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
}

export interface QuoteRequest {
  tripType: TripType;
  vehicleClassId: string;
  pickup: CoordinateField;
  dropoff: CoordinateField;
  pickupAddressLine: string;
  dropoffAddressLine: string;
  pickupPostcode: string;
  dropoffPostcode: string;
  scheduledPickupAt: Date;
  bookedHours: number | null;
  addonIds: string[];
  /** Optional validated promo to apply after add-ons. */
  appliedPromo?: QuotePromoApplication | null;
}

export interface QuoteResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  currencyCode: string;
  breakdown: QuoteLineItem[];
  snapshot: TripQuoteSnapshot;
  displayTotal: number;
  quotedPricesIncludeTax: boolean;
  quotedTaxRate: number;
}
