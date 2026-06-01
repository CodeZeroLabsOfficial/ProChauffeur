import type { VehicleType } from "@/lib/models/enums";

/** PricingConfig.VehicleTier.swift */
export interface VehicleTier {
  type: VehicleType;
  multiplier: number;
  minimumBookedHours: number;
  displayHourlyFrom?: number | null;
}

/** PricingConfig.Addon.swift */
export interface PricingAddon {
  id: string;
  title: string;
  price: number;
}

/** PricingConfig.swift — `app_settings/pricing` document. */
export interface PricingConfig {
  minimumFare: number;
  baseFare: number;
  distanceRatePerKm: number;
  timeRatePerHour: number;
  waitingFeeFlat: number;
  peakOrWeekendMultiplier: number;
  returnToBaseFee: number;
  vehicles: VehicleTier[];
  addons: PricingAddon[];
}

/** Built-in fallback fare card (mirrors PricingConfig.builtInDefault). */
export const defaultPricingConfig: PricingConfig = {
  minimumFare: 89,
  baseFare: 48,
  distanceRatePerKm: 3.4,
  timeRatePerHour: 98,
  waitingFeeFlat: 0,
  peakOrWeekendMultiplier: 1.22,
  returnToBaseFee: 55,
  vehicles: [
    { type: "sedan", multiplier: 1.0, minimumBookedHours: 2, displayHourlyFrom: 98 },
    { type: "suv", multiplier: 1.12, minimumBookedHours: 2, displayHourlyFrom: 110 },
    { type: "stretch_limo", multiplier: 1.55, minimumBookedHours: 4, displayHourlyFrom: 165 },
    { type: "sprinter_van", multiplier: 1.28, minimumBookedHours: 3, displayHourlyFrom: 125 }
  ],
  addons: [
    { id: "child_seat", title: "Child seat", price: 18 },
    { id: "meet_greet", title: "Meet & greet (airport)", price: 45 }
  ]
};
