import type { DocumentData } from "firebase/firestore";

import {
  DISTANCE_UNITS,
  PRICING_RULE_TYPES,
  QUOTE_ROUNDING,
  TAX_DISPLAY_MODES,
  TRIP_TYPES,
  WEEKDAY_NUMBERS,
  ZONE_MATCH_TYPES,
  type DistanceUnit,
  type PricingRuleType,
  type QuoteRounding,
  type TaxDisplayMode,
  type TripType,
  type WeekdayNumber
} from "@/lib/models/enums";
import type { OperatorLocale } from "@/lib/models/locale";
import type {
  HourlyPricingRates,
  PricingAddon,
  PricingConfig,
  PricingRule,
  PricingZone,
  TransferPricingRates
} from "@/lib/models/pricing";
import type { VehicleClass } from "@/lib/models/vehicle-class";
import { ConfigError } from "@/lib/pricing/errors";

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ConfigError(`Invalid ${field}: expected a number.`);
  }
  return value;
}

function requireNonNegative(value: unknown, field: string): number {
  const n = requireNumber(value, field);
  if (n < 0) throw new ConfigError(`Invalid ${field}: must be >= 0.`);
  return n;
}

function requirePositive(value: unknown, field: string): number {
  const n = requireNumber(value, field);
  if (n <= 0) throw new ConfigError(`Invalid ${field}: must be > 0.`);
  return n;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ConfigError(`Invalid ${field}: expected a non-empty string.`);
  }
  return value.trim();
}

function requireEnum<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ConfigError(`Invalid ${field}.`);
  }
  return value as T;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ConfigError(`Invalid ${field}: expected a boolean.`);
  }
  return value;
}

function parseWeekdays(value: unknown, field: string): WeekdayNumber[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ConfigError(`Invalid ${field}: expected a non-empty array.`);
  }
  return value.map((day, index) => {
    const n = requireNumber(day, `${field}[${index}]`);
    if (!WEEKDAY_NUMBERS.includes(n as WeekdayNumber)) {
      throw new ConfigError(`Invalid ${field}[${index}]: weekday must be 1–7.`);
    }
    return n as WeekdayNumber;
  });
}

export function parseTransferRates(d: DocumentData, path: string): TransferPricingRates {
  return {
    minimumBaseRate: requireNonNegative(d.minimumBaseRate, `${path}.minimumBaseRate`),
    baseFare: requireNonNegative(d.baseFare, `${path}.baseFare`),
    deadheadRatePerUnit: requireNonNegative(d.deadheadRatePerUnit, `${path}.deadheadRatePerUnit`),
    tripRatePerUnit: requireNonNegative(d.tripRatePerUnit, `${path}.tripRatePerUnit`),
    returnToBaseFee: requireNonNegative(d.returnToBaseFee, `${path}.returnToBaseFee`),
    waitingFeeFlat: requireNonNegative(d.waitingFeeFlat, `${path}.waitingFeeFlat`)
  };
}

export function parseHourlyRates(d: DocumentData, path: string): HourlyPricingRates {
  return {
    weekdayHourlyRate: requireNonNegative(d.weekdayHourlyRate, `${path}.weekdayHourlyRate`),
    weekendHourlyRate: requireNonNegative(d.weekendHourlyRate, `${path}.weekendHourlyRate`),
    weekdayMinimumHours: requirePositive(d.weekdayMinimumHours, `${path}.weekdayMinimumHours`),
    weekendMinimumHours: requirePositive(d.weekendMinimumHours, `${path}.weekendMinimumHours`),
    freeDeadheadMinutes: requireNonNegative(d.freeDeadheadMinutes, `${path}.freeDeadheadMinutes`),
    deadheadRatePerMinute: requireNonNegative(d.deadheadRatePerMinute, `${path}.deadheadRatePerMinute`),
    displayHourlyFrom: requireNonNegative(d.displayHourlyFrom, `${path}.displayHourlyFrom`)
  };
}

function parseAddon(d: DocumentData, index: number): PricingAddon {
  const path = `addons[${index}]`;
  const tripTypes = Array.isArray(d.tripTypes)
    ? d.tripTypes.map((t, i) => requireEnum(t, `${path}.tripTypes[${i}]`, TRIP_TYPES))
    : [];
  const vehicleClassIds = Array.isArray(d.vehicleClassIds)
    ? d.vehicleClassIds.map((id, i) => requireString(id, `${path}.vehicleClassIds[${i}]`))
    : [];
  return {
    id: requireString(d.id, `${path}.id`),
    title: requireString(d.title, `${path}.title`),
    price: requireNonNegative(d.price, `${path}.price`),
    isEnabled: requireBoolean(d.isEnabled, `${path}.isEnabled`),
    tripTypes: tripTypes as TripType[],
    vehicleClassIds
  };
}

function parseZone(d: DocumentData, index: number): PricingZone {
  const path = `zones[${index}]`;
  const match = (d.match ?? {}) as DocumentData;
  const zone: PricingZone = {
    id: requireString(d.id, `${path}.id`),
    name: requireString(d.name, `${path}.name`),
    isEnabled: requireBoolean(d.isEnabled, `${path}.isEnabled`),
    priority: requireNumber(d.priority, `${path}.priority`),
    match: {
      type: requireEnum(match.type, `${path}.match.type`, ZONE_MATCH_TYPES)
    }
  };
  if (zone.match.type === "postcode") {
    if (!Array.isArray(match.postcodes) || match.postcodes.length === 0) {
      throw new ConfigError(`Invalid ${path}.match.postcodes.`);
    }
    zone.match.postcodes = match.postcodes.map((p, i) => requireString(p, `${path}.match.postcodes[${i}]`));
  }
  if (typeof d.fixedTransferRate === "number") zone.fixedTransferRate = d.fixedTransferRate;
  if (typeof d.flatSurcharge === "number") zone.flatSurcharge = d.flatSurcharge;
  if (d.transferOverride && typeof d.transferOverride === "object") {
    zone.transferOverride = parseTransferRates(d.transferOverride as DocumentData, `${path}.transferOverride`);
  }
  return zone;
}

function parseRule(d: DocumentData, index: number): PricingRule {
  const path = `rules[${index}]`;
  const hasPercent = typeof d.percentAdjustment === "number";
  const hasFlat = typeof d.flatSurcharge === "number";
  if (hasPercent === hasFlat) {
    throw new ConfigError(`${path}: set exactly one of percentAdjustment or flatSurcharge.`);
  }
  return {
    id: requireString(d.id, `${path}.id`),
    name: requireString(d.name, `${path}.name`),
    isEnabled: requireBoolean(d.isEnabled, `${path}.isEnabled`),
    priority: requireNumber(d.priority, `${path}.priority`),
    type: requireEnum(d.type, `${path}.type`, PRICING_RULE_TYPES),
    percentAdjustment: hasPercent ? requireNonNegative(d.percentAdjustment, `${path}.percentAdjustment`) : undefined,
    flatSurcharge: hasFlat ? requireNumber(d.flatSurcharge, `${path}.flatSurcharge`) : undefined,
    weekdays: Array.isArray(d.weekdays) ? parseWeekdays(d.weekdays, `${path}.weekdays`) : undefined,
    startTime: typeof d.startTime === "string" ? d.startTime : undefined,
    endTime: typeof d.endTime === "string" ? d.endTime : undefined,
    dates: Array.isArray(d.dates) ? d.dates.map((v, i) => requireString(v, `${path}.dates[${i}]`)) : undefined,
    startDate: typeof d.startDate === "string" ? d.startDate : undefined,
    endDate: typeof d.endDate === "string" ? d.endDate : undefined
  };
}

export function parseVehicleClass(id: string, d: DocumentData): VehicleClass {
  const path = `vehicle_classes/${id}`;
  const supportedTripTypes = Array.isArray(d.supportedTripTypes)
    ? d.supportedTripTypes.map((t, i) => requireEnum(t, `${path}.supportedTripTypes[${i}]`, TRIP_TYPES))
    : [];
  if (supportedTripTypes.length === 0) {
    throw new ConfigError(`Invalid ${path}.supportedTripTypes: at least one trip type required.`);
  }
  return {
    id,
    slug: requireString(d.slug, `${path}.slug`),
    displayName: requireString(d.displayName, `${path}.displayName`),
    sortOrder: requireNumber(d.sortOrder, `${path}.sortOrder`),
    passengerCapacity: requirePositive(d.passengerCapacity, `${path}.passengerCapacity`),
    smallLuggageCount: requireNonNegative(d.smallLuggageCount, `${path}.smallLuggageCount`),
    largeLuggageCount: requireNonNegative(d.largeLuggageCount, `${path}.largeLuggageCount`),
    description: typeof d.description === "string" ? d.description : null,
    imageUrl: typeof d.imageUrl === "string" ? d.imageUrl : null,
    isEnabled: requireBoolean(d.isEnabled, `${path}.isEnabled`),
    isVisible:
      typeof d.isVisible === "boolean"
        ? d.isVisible
        : d.showOnBookingTool === true
          ? true
          : d.showOnBookingTool === false
            ? false
            : requireBoolean(d.isVisible, `${path}.isVisible`),
    supportedTripTypes: supportedTripTypes as TripType[],
    transfer: parseTransferRates(d.transfer ?? {}, `${path}.transfer`),
    hourly: parseHourlyRates(d.hourly ?? {}, `${path}.hourly`),
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
    updatedAt: d.updatedAt?.toDate?.() ?? new Date()
  };
}

export function parseOperatorLocale(d: DocumentData): OperatorLocale {
  return {
    locale: requireString(d.locale, "locale"),
    currency: requireString(d.currency, "currency"),
    timezone: requireString(d.timezone, "timezone"),
    distanceUnit: requireEnum(d.distanceUnit, "distanceUnit", DISTANCE_UNITS),
    defaultTaxRate: requireNonNegative(d.defaultTaxRate, "defaultTaxRate"),
    taxName: requireString(d.taxName, "taxName"),
    taxDisplayMode: requireEnum(d.taxDisplayMode, "taxDisplayMode", TAX_DISPLAY_MODES),
    showTaxOnQuotes: requireBoolean(d.showTaxOnQuotes, "showTaxOnQuotes")
  };
}

export function parsePricingConfig(d: DocumentData): PricingConfig {
  const schemaVersion = requirePositive(d.schemaVersion, "schemaVersion");
  if (schemaVersion < 2) {
    throw new ConfigError(
      "Pricing schema is outdated. Upgrade operator/pricing to schema v2."
    );
  }

  return {
    schemaVersion,
    minimumFare: requireNonNegative(d.minimumFare, "minimumFare"),
    baseFare: requireNonNegative(d.baseFare ?? 0, "baseFare"),
    distanceRatePerUnit: requireNonNegative(d.distanceRatePerUnit ?? 0, "distanceRatePerUnit"),
    timeRatePerHour: requireNonNegative(d.timeRatePerHour ?? 0, "timeRatePerHour"),
    waitingFeeFlat: requireNonNegative(d.waitingFeeFlat ?? 0, "waitingFeeFlat"),
    waitingFeePerMinute: requireNonNegative(d.waitingFeePerMinute ?? 0, "waitingFeePerMinute"),
    waitingGraceMinutes: requireNonNegative(d.waitingGraceMinutes ?? 0, "waitingGraceMinutes"),
    returnToBaseFee: requireNonNegative(d.returnToBaseFee ?? 0, "returnToBaseFee"),
    weekendWeekdays: parseWeekdays(d.weekendWeekdays, "weekendWeekdays"),
    quoteRounding: requireEnum(d.quoteRounding, "quoteRounding", QUOTE_ROUNDING),
    addons: Array.isArray(d.addons)
      ? d.addons.map((addon, index) => parseAddon(addon as DocumentData, index))
      : [],
    zones: Array.isArray(d.zones)
      ? d.zones.map((zone, index) => parseZone(zone as DocumentData, index))
      : [],
    rules: Array.isArray(d.rules)
      ? d.rules.map((rule, index) => parseRule(rule as DocumentData, index))
      : []
  };
}

export function validateOperatorLocale(locale: OperatorLocale): void {
  parseOperatorLocale(locale as unknown as DocumentData);
}

export function validatePricingConfig(config: PricingConfig): void {
  parsePricingConfig(config as unknown as DocumentData);
}

export function validateVehicleClass(vehicleClass: VehicleClass): void {
  parseVehicleClass(vehicleClass.id, vehicleClass as unknown as DocumentData);
}
