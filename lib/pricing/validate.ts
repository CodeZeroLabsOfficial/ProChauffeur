import type { DocumentData } from "firebase/firestore";

import {
  DISTANCE_UNITS,
  PRICING_RULE_TYPES,
  QUOTE_ROUNDING,
  TAX_DISPLAY_MODES,
  TRIP_TYPES,
  VEHICLE_TYPES,
  WEEKDAY_NUMBERS,
  ZONE_MATCH_TYPES,
  type DistanceUnit,
  type PricingRuleType,
  type QuoteRounding,
  type TaxDisplayMode,
  type TripType,
  type VehicleType,
  type WeekdayNumber
} from "@/lib/models/enums";
import type { OperatorLocale } from "@/lib/models/locale";
import type {
  HourlyPricingRates,
  PricingAddon,
  PricingConfig,
  PricingRule,
  PricingZone,
  TransferPricingRates,
  VehicleTier
} from "@/lib/models/pricing";
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

function parseTransferRates(d: DocumentData, path: string): TransferPricingRates {
  return {
    minimumBaseRate: requireNonNegative(d.minimumBaseRate, `${path}.minimumBaseRate`),
    baseFare: requireNonNegative(d.baseFare, `${path}.baseFare`),
    deadheadRatePerUnit: requireNonNegative(d.deadheadRatePerUnit, `${path}.deadheadRatePerUnit`),
    tripRatePerUnit: requireNonNegative(d.tripRatePerUnit, `${path}.tripRatePerUnit`),
    returnToBaseFee: requireNonNegative(d.returnToBaseFee, `${path}.returnToBaseFee`),
    waitingFeeFlat: requireNonNegative(d.waitingFeeFlat, `${path}.waitingFeeFlat`)
  };
}

function parseHourlyRates(d: DocumentData, path: string): HourlyPricingRates {
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

function parseVehicleTier(d: DocumentData, index: number): VehicleTier {
  const path = `vehicles[${index}]`;
  return {
    type: requireEnum(d.type, `${path}.type`, VEHICLE_TYPES),
    isEnabled: requireBoolean(d.isEnabled, `${path}.isEnabled`),
    transfer: parseTransferRates(d.transfer ?? {}, `${path}.transfer`),
    hourly: parseHourlyRates(d.hourly ?? {}, `${path}.hourly`)
  };
}

function parseAddon(d: DocumentData, index: number): PricingAddon {
  const path = `addons[${index}]`;
  const tripTypes = Array.isArray(d.tripTypes)
    ? d.tripTypes.map((t, i) => requireEnum(t, `${path}.tripTypes[${i}]`, TRIP_TYPES))
    : [];
  const vehicleTypes = Array.isArray(d.vehicleTypes)
    ? d.vehicleTypes.map((t, i) => requireEnum(t, `${path}.vehicleTypes[${i}]`, VEHICLE_TYPES))
    : [];
  return {
    id: requireString(d.id, `${path}.id`),
    title: requireString(d.title, `${path}.title`),
    price: requireNonNegative(d.price, `${path}.price`),
    isEnabled: requireBoolean(d.isEnabled, `${path}.isEnabled`),
    tripTypes: tripTypes as TripType[],
    vehicleTypes: vehicleTypes as VehicleType[]
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
  const vehicles = Array.isArray(d.vehicles)
    ? d.vehicles.map((tier, index) => parseVehicleTier(tier as DocumentData, index))
    : [];
  if (vehicles.length !== VEHICLE_TYPES.length) {
    throw new ConfigError(`pricing.vehicles must contain exactly ${VEHICLE_TYPES.length} tiers.`);
  }
  const types = new Set(vehicles.map((tier) => tier.type));
  for (const type of VEHICLE_TYPES) {
    if (!types.has(type)) {
      throw new ConfigError(`pricing.vehicles is missing tier: ${type}.`);
    }
  }

  return {
    schemaVersion: requirePositive(d.schemaVersion, "schemaVersion"),
    minimumFare: requireNonNegative(d.minimumFare, "minimumFare"),
    baseFare: requireNonNegative(d.baseFare, "baseFare"),
    distanceRatePerUnit: requireNonNegative(d.distanceRatePerUnit, "distanceRatePerUnit"),
    timeRatePerHour: requireNonNegative(d.timeRatePerHour, "timeRatePerHour"),
    waitingFeeFlat: requireNonNegative(d.waitingFeeFlat, "waitingFeeFlat"),
    waitingFeePerMinute: requireNonNegative(d.waitingFeePerMinute, "waitingFeePerMinute"),
    waitingGraceMinutes: requireNonNegative(d.waitingGraceMinutes, "waitingGraceMinutes"),
    returnToBaseFee: requireNonNegative(d.returnToBaseFee, "returnToBaseFee"),
    weekendWeekdays: parseWeekdays(d.weekendWeekdays, "weekendWeekdays"),
    quoteRounding: requireEnum(d.quoteRounding, "quoteRounding", QUOTE_ROUNDING),
    vehicles,
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
