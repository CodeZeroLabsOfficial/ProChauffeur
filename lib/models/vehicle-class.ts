import type { TripType } from "@/lib/models/enums";
import type { HourlyPricingRates, TransferPricingRates } from "@/lib/models/pricing";

export interface VehicleClassLuggageCapacity {
  smallCount: number;
  largeCount: number;
}

export interface VehicleClassCapacity {
  passengerCount: number;
  luggage: VehicleClassLuggageCapacity;
}

/** One booking-facing inclusion row shown under “What’s included”. */
export interface VehicleClassInclusion {
  id: string;
  label: string;
  value: string;
}

export const VEHICLE_CLASS_SERVICE_TIERS = [
  "Business",
  "First",
  "Executive",
  "Luxury"
] as const;

export type VehicleClassServiceTier = (typeof VEHICLE_CLASS_SERVICE_TIERS)[number];

export const VEHICLE_CLASS_BODY_TYPES = [
  "Sedan",
  "SUV",
  "Van",
  "Stretch",
  "Coach"
] as const;

export type VehicleClassBodyType = (typeof VEHICLE_CLASS_BODY_TYPES)[number];

/**
 * `branches/{branchId}/vehicle_classes/{id}` — service class + rate card.
 * `id` is the company-wide product key and must equal `slug` for new classes
 * (e.g. `business-sedan`). Each Location stores its own rates under the same id.
 */
export interface VehicleClass {
  /** Company-wide product key; same id in every Location that offers this class. */
  id: string;
  slug: string;
  displayName: string;
  sortOrder: number;
  /** Service tier shown on the Class specification chip (e.g. Business). */
  serviceTier: string;
  /** Body style shown on the Body specification chip (e.g. Sedan). */
  bodyType: string;
  capacity: VehicleClassCapacity;
  /** Ordered inclusion rows for booking “What’s included”. */
  inclusions: VehicleClassInclusion[];
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

/** URL-safe identifier derived from a display name (e.g. "Stretch Limo" → "stretch-limo"). */
export function slugFromDisplayName(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** True when `value` is already a slug (safe to use as the class document id). */
export function isValidVehicleClassSlug(value: string): boolean {
  return value.length > 0 && value === slugFromDisplayName(value);
}

export type CompanyVehicleClassOption = {
  id: string;
  label: string;
  locationNames: string[];
};

/** Dedupes Location class catalogues by product id for company pickers. */
export function unionCompanyVehicleClassOptions(
  rows: { id: string; displayName: string; locationName: string }[]
): CompanyVehicleClassOption[] {
  const byId = new Map<string, { names: string[]; locationNames: string[] }>();
  for (const row of rows) {
    const id = row.id.trim();
    if (!id) continue;
    const existing = byId.get(id);
    if (existing) {
      existing.names.push(row.displayName);
      if (!existing.locationNames.includes(row.locationName)) {
        existing.locationNames.push(row.locationName);
      }
      continue;
    }
    byId.set(id, { names: [row.displayName], locationNames: [row.locationName] });
  }

  const options: CompanyVehicleClassOption[] = [];
  for (const [id, group] of byId) {
    const counts = new Map<string, number>();
    for (const name of group.names) {
      const trimmed = name.trim() || id;
      counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
    }
    const label = [...counts.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0]![0];
    options.push({
      id,
      label,
      locationNames: [...group.locationNames].sort((a, b) => a.localeCompare(b))
    });
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function emptyVehicleClassCapacity(): VehicleClassCapacity {
  return {
    passengerCount: 4,
    luggage: { smallCount: 0, largeCount: 2 }
  };
}

export function emptyVehicleClassInclusions(): VehicleClassInclusion[] {
  return [];
}

export function buildInitialVehicleClass(
  overrides: Partial<VehicleClass> & Pick<VehicleClass, "displayName">
): VehicleClass {
  const now = new Date();
  const displayName = overrides.displayName;
  const slug = overrides.slug ?? slugFromDisplayName(displayName);
  const id = overrides.id ?? slug;
  return {
    sortOrder: 0,
    serviceTier: "Business",
    bodyType: "Sedan",
    capacity: emptyVehicleClassCapacity(),
    inclusions: emptyVehicleClassInclusions(),
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
    ...overrides,
    displayName,
    slug,
    id
  };
}
