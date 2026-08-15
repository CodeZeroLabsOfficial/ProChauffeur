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

/** Country locale seed. Timezone and later city policies live under `cities`. */
const localeSchema = z.object({
  locale: z.string().min(1),
  currency: z.string().min(1),
  distanceUnit: z.enum(DISTANCE_UNITS),
  defaultTaxRate: z.number().nonnegative(),
  taxName: z.string().min(1),
  taxDisplayMode: z.enum(TAX_DISPLAY_MODES),
  showTaxOnQuotes: z.boolean(),
  operatorJurisdiction: z.string().min(1),
  mapboxJurisdiction: z.string().min(1)
});

/** Per-city overlay. Timezone is required; other policies are added later. */
const citySeedSchema = z.object({
  timezone: z.string().min(1)
});

const citiesSchema = z
  .record(z.string().min(1), citySeedSchema)
  .refine((map) => Object.keys(map).length > 0, {
    message: "cities must list at least one city."
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

/** Default service area policy. Center is filled from the office at create. */
const serviceAreaPolicySchema = z
  .object({
    type: z.literal("radius"),
    radiusMeters: z.number().int().positive()
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
  cities: citiesSchema,
  pricing: pricingSchema,
  vehicleClasses: z.array(seedVehicleClassSchema).min(1),
  operatingHours: operatingHoursSchema,
  serviceArea: serviceAreaPolicySchema
});

export type LocationSeedManifest = z.infer<typeof locationSeedManifestSchema>;
export type LocationRegionSeed = z.infer<typeof locationRegionSeedSchema>;
export type SeedOperatorLocale = z.infer<typeof localeSchema>;
export type SeedCityConfig = z.infer<typeof citySeedSchema>;

export type LocationRegionSummary = {
  id: string;
  label: string;
  mapboxJurisdiction: string;
  locale: SeedOperatorLocale;
  cities: Record<string, SeedCityConfig>;
  serviceAreaRadiusMeters: number | null;
  vehicleClassNames: string[];
};

export function normalizeCityKey(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, " ");
}

export function formatCityLabel(city: string): string {
  return normalizeCityKey(city)
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function listedCityNames(cities: Record<string, SeedCityConfig>): string[] {
  return Object.keys(cities)
    .map((key) => formatCityLabel(key))
    .sort((a, b) => a.localeCompare(b));
}

export function resolveCityConfig(
  city: string,
  cities: Record<string, SeedCityConfig>
): SeedCityConfig | null {
  const key = normalizeCityKey(city);
  if (!key) return null;
  for (const [name, config] of Object.entries(cities)) {
    if (normalizeCityKey(name) === key) return config;
  }
  return null;
}

export function resolveCityTimezone(
  city: string,
  cities: Record<string, SeedCityConfig>
): string | null {
  const timezone = resolveCityConfig(city, cities)?.timezone.trim();
  return timezone || null;
}

export function unknownCityTimezoneError(
  city: string,
  cities: Record<string, SeedCityConfig>
): string {
  const listed = listedCityNames(cities).join(", ");
  return `No time zone for city "${city.trim()}". Use a listed city (${listed}).`;
}

export function localeFromSeed(seed: LocationRegionSeed, city: string): OperatorLocale {
  const timezone = resolveCityTimezone(city, seed.cities);
  if (!timezone) {
    throw new Error(unknownCityTimezoneError(city, seed.cities));
  }
  return { ...seed.locale, timezone };
}

export function toRegionSummary(seed: LocationRegionSeed): LocationRegionSummary {
  return {
    id: seed.id,
    label: seed.label,
    mapboxJurisdiction: seed.mapboxJurisdiction,
    locale: seed.locale,
    cities: seed.cities,
    serviceAreaRadiusMeters:
      seed.serviceArea?.type === "radius" ? seed.serviceArea.radiusMeters : null,
    vehicleClassNames: seed.vehicleClasses.map((row) => row.displayName)
  };
}

export function seedPricingConfig(seed: LocationRegionSeed): PricingConfig {
  return seed.pricing as PricingConfig;
}

export function seedOperatingHours(seed: LocationRegionSeed): AppFleetOperatingHours {
  return seed.operatingHours as AppFleetOperatingHours;
}

export function seedServiceAreaFromOffice(
  seed: LocationRegionSeed,
  office: { addressLine: string; latitude: number; longitude: number }
): Branch["serviceArea"] {
  const policy = seed.serviceArea;
  if (!policy || policy.type !== "radius" || policy.radiusMeters <= 0) return null;
  return {
    type: "radius",
    centerLatitude: office.latitude,
    centerLongitude: office.longitude,
    centerAddressLine: office.addressLine,
    radiusMeters: policy.radiusMeters
  };
}
