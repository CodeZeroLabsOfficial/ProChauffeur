import {
  type PricingRuleType,
  type QuoteRounding,
  type TripType,
  type WeekdayNumber,
  type ZoneMatchType
} from "@/lib/models/enums";
import type { CoordinateField } from "@/lib/models/trip";

export interface TransferPricingRates {
  minimumBaseRate: number;
  baseFare: number;
  deadheadRatePerUnit: number;
  tripRatePerUnit: number;
  returnToBaseFee: number;
  waitingFeeFlat: number;
}

export interface HourlyPricingRates {
  weekdayHourlyRate: number;
  weekendHourlyRate: number;
  weekdayMinimumHours: number;
  weekendMinimumHours: number;
  freeDeadheadMinutes: number;
  deadheadRatePerMinute: number;
  displayHourlyFrom: number;
}

export interface PricingAddon {
  id: string;
  title: string;
  price: number;
  isEnabled: boolean;
  tripTypes: TripType[];
  vehicleClassIds: string[];
}

export interface PricingZoneMatch {
  type: ZoneMatchType;
  postcodes?: string[];
  centerLatitude?: number;
  centerLongitude?: number;
  radiusKm?: number;
  polygonCoordinates?: CoordinateField[];
}

export interface PricingZone {
  id: string;
  name: string;
  isEnabled: boolean;
  priority: number;
  match: PricingZoneMatch;
  fixedTransferRate?: number;
  flatSurcharge?: number;
  transferOverride?: Partial<TransferPricingRates>;
}

export interface PricingRule {
  id: string;
  name: string;
  isEnabled: boolean;
  priority: number;
  type: PricingRuleType;
  percentAdjustment?: number;
  flatSurcharge?: number;
  weekdays?: WeekdayNumber[];
  startTime?: string;
  endTime?: string;
  dates?: string[];
  startDate?: string;
  endDate?: string;
}

/**
 * PricingConfig — `operator/pricing` document (schema v2).
 * Quotes read transfer/hourly rates from vehicle classes only.
 * This document holds company-wide rules, add-ons, zones, and optional floors.
 */
export interface PricingConfig {
  schemaVersion: number;
  /** Company-wide transfer floor applied after vehicle class calculation. */
  minimumFare: number;
  /** Schema v2 legacy — retained for Firestore compatibility; not used in quotes. */
  baseFare: number;
  /** Schema v2 legacy — retained for Firestore compatibility; not used in quotes. */
  distanceRatePerUnit: number;
  /** Schema v2 legacy — retained for Firestore compatibility; not used in quotes. */
  timeRatePerHour: number;
  /** Schema v2 legacy — retained for Firestore compatibility; not used in quotes. */
  waitingFeeFlat: number;
  /** Schema v2 legacy — retained for Firestore compatibility; not used in quotes. */
  waitingFeePerMinute: number;
  /** Schema v2 legacy — retained for Firestore compatibility; not used in quotes. */
  waitingGraceMinutes: number;
  /** Schema v2 legacy — retained for Firestore compatibility; not used in quotes. */
  returnToBaseFee: number;
  /** Weekdays treated as weekend for hourly class rates (e.g. Sat–Sun). */
  weekendWeekdays: WeekdayNumber[];
  quoteRounding: QuoteRounding;
  addons: PricingAddon[];
  zones: PricingZone[];
  rules: PricingRule[];
}

const LEGACY_PRICING_RATE_DEFAULTS = {
  baseFare: 0,
  distanceRatePerUnit: 0,
  timeRatePerHour: 0,
  waitingFeeFlat: 0,
  waitingFeePerMinute: 0,
  waitingGraceMinutes: 0,
  returnToBaseFee: 0
} as const;

/** Zeros schema v2 legacy rate fields before persisting operator pricing. */
export function preparePricingConfigForSave(config: PricingConfig): PricingConfig {
  return {
    ...config,
    schemaVersion: 2,
    ...LEGACY_PRICING_RATE_DEFAULTS
  };
}

/** Admin setup template only — not used at runtime when fetching config. */
export function buildInitialPricingConfig(): PricingConfig {
  return {
    schemaVersion: 2,
    minimumFare: 89,
    ...LEGACY_PRICING_RATE_DEFAULTS,
    weekendWeekdays: [6, 7],
    quoteRounding: "dollar",
    addons: [
      {
        id: "child_seat",
        title: "Child seat",
        price: 18,
        isEnabled: true,
        tripTypes: ["transfer", "hourly"],
        vehicleClassIds: []
      },
      {
        id: "meet_greet",
        title: "Meet & greet (airport)",
        price: 45,
        isEnabled: true,
        tripTypes: ["transfer"],
        vehicleClassIds: []
      }
    ],
    zones: [],
    rules: []
  };
}
