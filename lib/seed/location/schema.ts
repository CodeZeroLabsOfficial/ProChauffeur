import { z } from "zod";

import {
  DISTANCE_UNITS,
  QUOTE_ROUNDING,
  TAX_DISPLAY_MODES,
  TRIP_TYPES,
  type OperatorLocale,
  type PricingConfig,
  type AppFleetOperatingHours,
  type Branch
} from "@/lib/models";

const tripTypeSchema = z.enum(TRIP_TYPES);

const transferRatesSchema = z.object({
  minimumBaseRate: z.number(),
  baseFare: z.number(),
  deadheadRatePerUnit: z.number(),
  tripRatePerUnit: z.number(),
  returnToBaseFee: z.number(),
  waitingFeeFlat: z.number()
});

const hourlyRatesSchema = z.object({
  weekdayHourlyRate: z.number(),
  weekendHourlyRate: z.number(),
  weekdayMinimumHours: z.number(),
  weekendMinimumHours: z.number(),
  freeDeadheadMinutes: z.number(),
  deadheadRatePerMinute: z.number(),
  displayHourlyFrom: z.number()
});

const localeSchema = z.object({
  locale: z.string().min(1),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  distanceUnit: z.enum(DISTANCE_UNITS),
  defaultTaxRate: z.number().nonnegative(),
  taxName: z.string().min(1),
  taxDisplayMode: z.enum(TAX_DISPLAY_MODES),
  showTaxOnQuotes: z.boolean(),
  operatorJurisdiction: z.string().min(1),
  mapboxJurisdiction: z.string().min(1)
});

const pricingAddonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  price: z.number(),
  isEnabled: z.boolean(),
  tripTypes: z.array(tripTypeSchema),
  vehicleClassIds: z.array(z.string())
});

const pricingSchema = z.object({
  schemaVersion: z.number().int().min(2),
  minimumFare: z.number().nonnegative(),
  weekendWeekdays: z.array(z.number().int()),
  quoteRounding: z.enum(QUOTE_ROUNDING),
  addons: z.array(pricingAddonSchema),
  zones: z.array(z.unknown()),
  rules: z.array(z.unknown())
});

const seedVehicleClassSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  displayName: z.string().min(1),
  sortOrder: z.number(),
  serviceTier: z.string().min(1),
  bodyType: z.string().min(1),
  capacity: z.object({
    passengerCount: z.number(),
    luggage: z.object({
      smallCount: z.number(),
      largeCount: z.number()
    })
  }),
  inclusions: z.array(
    z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      value: z.string()
    })
  ),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  isEnabled: z.boolean(),
  isVisible: z.boolean(),
  supportedTripTypes: z.array(tripTypeSchema).min(1),
  transfer: transferRatesSchema,
  hourly: hourlyRatesSchema
});

const operatingHoursSchema = z.object({
  schedules: z.array(z.unknown())
});

const serviceAreaSchema = z
  .object({
    type: z.enum(["postcodes", "radius", "polygon"]),
    postcodes: z.array(z.string()).optional(),
    centerLatitude: z.number().optional(),
    centerLongitude: z.number().optional(),
    centerAddressLine: z.string().nullable().optional(),
    radiusMeters: z.number().optional(),
    polygon: z.array(z.object({ latitude: z.number(), longitude: z.number() })).optional()
  })
  .nullable();

export const locationSeedManifestSchema = z.object({
  version: z.number().int().positive(),
  regions: z.array(z.string().min(1)).min(1)
});

export const locationRegionSeedSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  mapboxJurisdiction: z.string(),
  locale: localeSchema,
  pricing: pricingSchema,
  vehicleClasses: z.array(seedVehicleClassSchema).min(1),
  operatingHours: operatingHoursSchema,
  serviceArea: serviceAreaSchema
});

export type LocationSeedManifest = z.infer<typeof locationSeedManifestSchema>;
export type LocationRegionSeed = z.infer<typeof locationRegionSeedSchema>;

export type LocationRegionSummary = {
  id: string;
  label: string;
  mapboxJurisdiction: string;
  locale: OperatorLocale;
  vehicleClassNames: string[];
};

export function toRegionSummary(seed: LocationRegionSeed): LocationRegionSummary {
  return {
    id: seed.id,
    label: seed.label,
    mapboxJurisdiction: seed.mapboxJurisdiction,
    locale: seed.locale,
    vehicleClassNames: seed.vehicleClasses.map((row) => row.displayName)
  };
}

export function seedPricingConfig(seed: LocationRegionSeed): PricingConfig {
  return seed.pricing as PricingConfig;
}

export function seedOperatingHours(seed: LocationRegionSeed): AppFleetOperatingHours {
  return seed.operatingHours as AppFleetOperatingHours;
}

export function seedServiceArea(seed: LocationRegionSeed): Branch["serviceArea"] {
  return (seed.serviceArea ?? null) as Branch["serviceArea"];
}
