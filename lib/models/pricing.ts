import {
  VEHICLE_TYPES,
  type PricingRuleType,
  type QuoteRounding,
  type TripType,
  type VehicleType,
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

/** PricingConfig.VehicleTier — one entry per vehicle class. */
export interface VehicleTier {
  type: VehicleType;
  isEnabled: boolean;
  transfer: TransferPricingRates;
  hourly: HourlyPricingRates;
}

export interface PricingAddon {
  id: string;
  title: string;
  price: number;
  isEnabled: boolean;
  tripTypes: TripType[];
  vehicleTypes: VehicleType[];
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

/** PricingConfig — `operator/pricing` document. */
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
  vehicles: VehicleTier[];
  addons: PricingAddon[];
  zones: PricingZone[];
  rules: PricingRule[];
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
  const vehicleDefaults: Record<
    VehicleType,
    { transfer: Partial<TransferPricingRates>; hourly: Partial<HourlyPricingRates> }
  > = {
    sedan: {
      transfer: defaultTransferRates(),
      hourly: defaultHourlyRates({ displayHourlyFrom: 98 })
    },
    suv: {
      transfer: defaultTransferRates({
        minimumBaseRate: 100,
        tripRatePerUnit: 3.8,
        deadheadRatePerUnit: 3.1
      }),
      hourly: defaultHourlyRates({
        weekdayHourlyRate: 110,
        weekendHourlyRate: 135,
        displayHourlyFrom: 110
      })
    },
    stretch_limo: {
      transfer: defaultTransferRates({
        minimumBaseRate: 138,
        tripRatePerUnit: 5.3,
        deadheadRatePerUnit: 4.3
      }),
      hourly: defaultHourlyRates({
        weekdayHourlyRate: 165,
        weekendHourlyRate: 200,
        weekdayMinimumHours: 4,
        weekendMinimumHours: 4,
        displayHourlyFrom: 165
      })
    },
    sprinter_van: {
      transfer: defaultTransferRates({
        minimumBaseRate: 114,
        tripRatePerUnit: 4.4,
        deadheadRatePerUnit: 3.6
      }),
      hourly: defaultHourlyRates({
        weekdayHourlyRate: 125,
        weekendHourlyRate: 155,
        weekdayMinimumHours: 3,
        weekendMinimumHours: 3,
        displayHourlyFrom: 125
      })
    }
  };

  return {
    schemaVersion: 1,
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
    vehicles: VEHICLE_TYPES.map((type) => ({
      type,
      isEnabled: true,
      transfer: defaultTransferRates(vehicleDefaults[type].transfer),
      hourly: defaultHourlyRates(vehicleDefaults[type].hourly)
    })),
    addons: [
      {
        id: "child_seat",
        title: "Child seat",
        price: 18,
        isEnabled: true,
        tripTypes: ["transfer", "hourly"],
        vehicleTypes: [...VEHICLE_TYPES]
      },
      {
        id: "meet_greet",
        title: "Meet & greet (airport)",
        price: 45,
        isEnabled: true,
        tripTypes: ["transfer"],
        vehicleTypes: [...VEHICLE_TYPES]
      }
    ],
    zones: [],
    rules: []
  };
}
