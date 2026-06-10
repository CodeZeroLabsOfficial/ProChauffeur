import type { DistanceUnit, QuoteLineCategory, TripType, VehicleType } from "@/lib/models/enums";
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
  vehicleType: VehicleType;
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
  pickupPostcode: string;
  dropoffPostcode: string;
  scheduledPickupAt: Date;
}

export interface QuoteRequest {
  tripType: TripType;
  vehicleType: VehicleType;
  pickup: CoordinateField;
  dropoff: CoordinateField;
  pickupAddressLine: string;
  dropoffAddressLine: string;
  pickupPostcode: string;
  dropoffPostcode: string;
  scheduledPickupAt: Date;
  bookedHours: number | null;
  addonIds: string[];
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
