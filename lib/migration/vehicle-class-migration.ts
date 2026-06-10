import type { DocumentData } from "firebase/firestore";

import { WEEKDAY_NUMBERS, type VehicleType, type WeekdayNumber } from "@/lib/models/enums";
import type { PricingConfig } from "@/lib/models/pricing";
import {
  LEGACY_VEHICLE_TYPE_DISPLAY_NAMES,
  LEGACY_VEHICLE_TYPE_SLUGS,
  buildInitialVehicleClass,
  type VehicleClass
} from "@/lib/models/vehicle-class";
import { parseTransferRates, parseHourlyRates } from "@/lib/pricing/validate";

const LEGACY_VEHICLE_TYPES: VehicleType[] = ["sedan", "suv", "stretch_limo", "sprinter_van"];
const VALID_WEEKDAYS = new Set<number>(WEEKDAY_NUMBERS);

function parseWeekendWeekdays(value: unknown): WeekdayNumber[] {
  if (!Array.isArray(value)) return [6, 7];
  return value
    .map((day) => Number(day))
    .filter((day): day is WeekdayNumber => VALID_WEEKDAYS.has(day));
}

export function isLegacyPricingDocument(d: DocumentData): boolean {
  return typeof d.schemaVersion === "number" && d.schemaVersion < 2 && Array.isArray(d.vehicles);
}

export function buildVehicleClassesFromLegacyPricing(
  pricingData: DocumentData,
  existingSlugs: Set<string>
): VehicleClass[] {
  const vehicles = pricingData.vehicles as DocumentData[];
  const classes: VehicleClass[] = [];
  const now = new Date();

  LEGACY_VEHICLE_TYPES.forEach((type, index) => {
    const tier = vehicles.find((entry) => entry.type === type);
    const slug = LEGACY_VEHICLE_TYPE_SLUGS[type];
    if (existingSlugs.has(slug)) return;

    const transfer = tier
      ? parseTransferRates(tier.transfer ?? {}, `vehicles.${type}.transfer`)
      : buildInitialVehicleClass({ id: "", slug, displayName: "" }).transfer;
    const hourly = tier
      ? parseHourlyRates(tier.hourly ?? {}, `vehicles.${type}.hourly`)
      : buildInitialVehicleClass({ id: "", slug, displayName: "" }).hourly;

    classes.push(
      buildInitialVehicleClass({
        id: crypto.randomUUID(),
        slug,
        displayName: LEGACY_VEHICLE_TYPE_DISPLAY_NAMES[type],
        sortOrder: index,
        isEnabled: tier?.isEnabled !== false,
        isVisible: tier?.isEnabled !== false,
        transfer,
        hourly,
        createdAt: now,
        updatedAt: now
      })
    );
  });

  return classes;
}

export function migratePricingConfigToV2(
  pricingData: DocumentData,
  classIds: string[]
): PricingConfig {
  const addons = Array.isArray(pricingData.addons)
    ? (pricingData.addons as DocumentData[]).map((addon) => ({
        id: String(addon.id ?? crypto.randomUUID()),
        title: String(addon.title ?? "Add-on"),
        price: Number(addon.price ?? 0),
        isEnabled: addon.isEnabled !== false,
        tripTypes: Array.isArray(addon.tripTypes) ? addon.tripTypes : ["transfer"],
        vehicleClassIds:
          Array.isArray(addon.vehicleClassIds) && addon.vehicleClassIds.length > 0
            ? addon.vehicleClassIds.map(String)
            : classIds
      }))
    : [];

  return {
    schemaVersion: 2,
    minimumFare: Number(pricingData.minimumFare ?? 0),
    baseFare: Number(pricingData.baseFare ?? 0),
    distanceRatePerUnit: Number(pricingData.distanceRatePerUnit ?? 0),
    timeRatePerHour: Number(pricingData.timeRatePerHour ?? 0),
    waitingFeeFlat: Number(pricingData.waitingFeeFlat ?? 0),
    waitingFeePerMinute: Number(pricingData.waitingFeePerMinute ?? 0),
    waitingGraceMinutes: Number(pricingData.waitingGraceMinutes ?? 0),
    returnToBaseFee: Number(pricingData.returnToBaseFee ?? 0),
    weekendWeekdays: parseWeekendWeekdays(pricingData.weekendWeekdays),
    quoteRounding: pricingData.quoteRounding ?? "dollar",
    addons,
    zones: Array.isArray(pricingData.zones) ? pricingData.zones : [],
    rules: Array.isArray(pricingData.rules) ? pricingData.rules : []
  };
}

export function legacyVehicleTypeToClassId(
  type: string | null | undefined,
  classesBySlug: Map<string, VehicleClass>
): string | null {
  if (!type) return null;
  const slug = LEGACY_VEHICLE_TYPE_SLUGS[type as VehicleType];
  if (!slug) return null;
  return classesBySlug.get(slug)?.id ?? null;
}
