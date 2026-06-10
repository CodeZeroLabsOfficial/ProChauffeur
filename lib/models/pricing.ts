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

/** PricingConfig — `operator/pricing` document (schema v2: rates live on vehicle_classes). */
export interface PricingConfig {
  schemaVersion: number;
  minimumFare: number;
  baseFare: number;
  distanceRatePerUnit: number;
  timeRatePerHour: number;
  waitingFeeFlat: number;
  waitingFeePerMinute: number;
  waitingGraceMinutes: number;
  returnToBaseFee: number;
  weekendWeekdays: WeekdayNumber[];
  quoteRounding: QuoteRounding;
  addons: PricingAddon[];
  zones: PricingZone[];
  rules: PricingRule[];
}

/** Legacy tier embedded in pricing v1 — migration only. */
export interface LegacyVehicleTier {
  type: string;
  isEnabled: boolean;
  transfer: TransferPricingRates;
  hourly: HourlyPricingRates;
}

export function defaultTransferRates(overrides?: Partial<TransferPricingRates>): TransferPricingRates {
  return {
    minimumBaseRate: 89,
    baseFare: 48,
    deadheadRatePerUnit: 2.8,
    tripRatePerUnit: 3.4,
    returnToBaseFee: 55,
    waitingFeeFlat: 0,
    ...overrides
  };
}

export function defaultHourlyRates(overrides?: Partial<HourlyPricingRates>): HourlyPricingRates {
  return {
    weekdayHourlyRate: 98,
    weekendHourlyRate: 120,
    weekdayMinimumHours: 2,
    weekendMinimumHours: 3,
    freeDeadheadMinutes: 60,
    deadheadRatePerMinute: 1.5,
    displayHourlyFrom: 98,
    ...overrides
  };
}

/** Admin setup template only — not used at runtime when fetching config. */
export function buildInitialPricingConfig(): PricingConfig {
  return {
    schemaVersion: 2,
    minimumFare: 89,
    baseFare: 48,
    distanceRatePerUnit: 3.4,
    timeRatePerHour: 98,
    waitingFeeFlat: 0,
    waitingFeePerMinute: 1.5,
    waitingGraceMinutes: 15,
    returnToBaseFee: 55,
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
