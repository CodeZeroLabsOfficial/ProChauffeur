import type { TripType, VehicleType } from "@/lib/models/enums";
import type { HourlyPricingRates, TransferPricingRates } from "@/lib/models/pricing";

/** `vehicle_classes/{id}` — service class + rate card. */
export interface VehicleClass {
  id: string;
  slug: string;
  displayName: string;
  sortOrder: number;
  passengerCapacity: number;
  smallLuggageCount: number;
  largeLuggageCount: number;
  description?: string | null;
  imageUrl?: string | null;
  isEnabled: boolean;
  isVisible: boolean;
  supportedTripTypes: TripType[];
  transfer: TransferPricingRates;
  hourly: HourlyPricingRates;
  createdAt: Date;
  updatedAt: Date;
}

/** Legacy enum → slug when migrating from `pricingVehicleType`. */
export const LEGACY_VEHICLE_TYPE_SLUGS: Record<VehicleType, string> = {
  sedan: "sedan",
  suv: "suv",
  stretch_limo: "stretch-limo",
  sprinter_van: "sprinter-van"
};

export const LEGACY_VEHICLE_TYPE_DISPLAY_NAMES: Record<VehicleType, string> = {
  sedan: "Sedan",
  suv: "SUV",
  stretch_limo: "Stretch Limo",
  sprinter_van: "Sprinter Van"
};

export function buildInitialVehicleClass(
  overrides: Partial<VehicleClass> & Pick<VehicleClass, "id" | "slug" | "displayName">
): VehicleClass {
  const now = new Date();
  return {
    sortOrder: 0,
    passengerCapacity: 4,
    smallLuggageCount: 0,
    largeLuggageCount: 2,
    description: null,
    imageUrl: null,
    isEnabled: true,
    isVisible: true,
    supportedTripTypes: ["transfer", "hourly"],
    transfer: {
      minimumBaseRate: 89,
      baseFare: 48,
      deadheadRatePerUnit: 2.8,
      tripRatePerUnit: 3.4,
      returnToBaseFee: 55,
      waitingFeeFlat: 0
    },
    hourly: {
      weekdayHourlyRate: 98,
      weekendHourlyRate: 120,
      weekdayMinimumHours: 2,
      weekendMinimumHours: 3,
      freeDeadheadMinutes: 60,
      deadheadRatePerMinute: 1.5,
      displayHourlyFrom: 98
    },
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}
