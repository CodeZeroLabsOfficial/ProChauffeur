import type { FleetLocation } from "@/lib/models/location";
import type { OperatorLocale } from "@/lib/models/locale";
import type {
  PricingAddon,
  PricingConfig,
  PricingRule,
  PricingZone,
  TransferPricingRates
} from "@/lib/models/pricing";
import type { VehicleClass } from "@/lib/models/vehicle-class";
import type { QuoteRequest, QuoteResult, QuoteLineItem, TripQuoteSnapshot } from "@/lib/models/quote";
import type { WeekdayNumber } from "@/lib/models/enums";
import { metersToDistanceUnit } from "@/lib/pricing/distance";
import { QuoteError } from "@/lib/pricing/errors";

export interface QuoteEngineContext {
  pricing: PricingConfig;
  locale: OperatorLocale;
  vehicleClass: VehicleClass;
  garageLocation: FleetLocation;
  routeDistanceMeters: number;
  deadheadDistanceMeters: number;
  deadheadDurationMinutes: number;
}

function lineId(): string {
  return crypto.randomUUID();
}

function isoWeekdayInTimezone(date: Date, timeZone: string): WeekdayNumber {
  const weekday =
    new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const map: Record<string, WeekdayNumber> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7
  };
  return map[weekday] ?? 1;
}

function timeStringInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((part) => parseInt(part, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function isTimeWithinRange(now: string, start: string, end: string): boolean {
  const current = parseTimeToMinutes(now);
  const from = parseTimeToMinutes(start);
  const to = parseTimeToMinutes(end);
  if (from <= to) return current >= from && current < to;
  return current >= from || current < to;
}

function dateStringInTimezone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function roundTotal(total: number, mode: PricingConfig["quoteRounding"]): number {
  if (mode === "dollar") return Math.round(total);
  if (mode === "half_dollar") return Math.round(total * 2) / 2;
  return Math.round(total * 100) / 100;
}

function requireVehicleClass(vehicleClass: VehicleClass): VehicleClass {
  if (!vehicleClass.isEnabled) {
    throw new QuoteError(`Vehicle class "${vehicleClass.displayName}" is not enabled.`);
  }
  return vehicleClass;
}

function computeTransferBase(
  vehicleClass: VehicleClass,
  onboardUnits: number,
  deadheadUnits: number
): { amount: number; lines: QuoteLineItem[] } {
  const rates = vehicleClass.transfer;
  const distanceCharge =
    deadheadUnits * rates.deadheadRatePerUnit + onboardUnits * rates.tripRatePerUnit;
  const raw = rates.baseFare + distanceCharge + rates.returnToBaseFee;
  const amount = Math.max(rates.minimumBaseRate, raw);
  const lines: QuoteLineItem[] = [
    {
      id: lineId(),
      label: "Base fare",
      amount: rates.baseFare,
      category: "base",
      isInternal: true
    }
  ];
  if (deadheadUnits > 0) {
    lines.push({
      id: lineId(),
      label: "Deadhead",
      amount: deadheadUnits * rates.deadheadRatePerUnit,
      category: "deadhead",
      isInternal: true
    });
  }
  if (onboardUnits > 0) {
    lines.push({
      id: lineId(),
      label: "Distance",
      amount: onboardUnits * rates.tripRatePerUnit,
      category: "distance",
      isInternal: true
    });
  }
  if (amount > raw) {
    lines.push({
      id: lineId(),
      label: "Minimum fare",
      amount: amount - raw,
      category: "minimum",
      isInternal: true
    });
  }
  return { amount, lines };
}

function computeHourlyBase(
  vehicleClass: VehicleClass,
  weekday: WeekdayNumber,
  weekendWeekdays: Set<WeekdayNumber>,
  bookedHours: number,
  deadheadDurationMinutes: number
): { amount: number; lines: QuoteLineItem[] } {
  const rates = vehicleClass.hourly;
  const isWeekend = weekendWeekdays.has(weekday);
  const hourlyRate = isWeekend ? rates.weekendHourlyRate : rates.weekdayHourlyRate;
  const minimumHours = isWeekend ? rates.weekendMinimumHours : rates.weekdayMinimumHours;
  const billableHours = Math.max(minimumHours, bookedHours);
  const chargeableDeadhead = Math.max(0, deadheadDurationMinutes - rates.freeDeadheadMinutes);
  const deadheadCharge = (chargeableDeadhead / 60) * rates.deadheadRatePerMinute;
  const amount = billableHours * hourlyRate + deadheadCharge;
  const lines: QuoteLineItem[] = [
    {
      id: lineId(),
      label: `${billableHours} hr @ ${hourlyRate}`,
      amount: billableHours * hourlyRate,
      category: "hourly",
      isInternal: true
    }
  ];
  if (deadheadCharge > 0) {
    lines.push({
      id: lineId(),
      label: "Deadhead time",
      amount: deadheadCharge,
      category: "deadhead",
      isInternal: true
    });
  }
  if (billableHours > bookedHours) {
    lines.push({
      id: lineId(),
      label: "Minimum hours",
      amount: 0,
      category: "minimum",
      isInternal: true
    });
  }
  return { amount, lines };
}

type PickupTimeContext = {
  weekday: WeekdayNumber;
  time: string;
  date: string;
};

function normalizedZonePostcodes(zone: PricingZone): Set<string> {
  const postcodes = zone.match.postcodes ?? [];
  return new Set(postcodes.map((p) => p.trim().toUpperCase()));
}

function zoneMatchesPostcode(
  normalized: Set<string>,
  pickupPostcode: string,
  dropoffPostcode: string
): boolean {
  const pickup = pickupPostcode.trim().toUpperCase();
  const dropoff = dropoffPostcode.trim().toUpperCase();
  return (
    (pickup.length > 0 && normalized.has(pickup)) ||
    (dropoff.length > 0 && normalized.has(dropoff))
  );
}

function matchingZones(
  pricing: PricingConfig,
  pickupPostcode: string,
  dropoffPostcode: string
): PricingZone[] {
  const matched: PricingZone[] = [];
  for (const zone of pricing.zones) {
    if (!zone.isEnabled) continue;
    if (zone.match.type !== "postcode") continue;
    const normalized = normalizedZonePostcodes(zone);
    if (zoneMatchesPostcode(normalized, pickupPostcode, dropoffPostcode)) {
      matched.push(zone);
    }
  }
  return matched;
}

function applyZoneLayer(
  baseAmount: number,
  baseLines: QuoteLineItem[],
  zones: PricingZone[]
): {
  amount: number;
  lines: QuoteLineItem[];
  matchedZoneIds: string[];
  appliedFixedZoneId: string | null;
  appliedZoneSurchargeIds: string[];
} {
  const matchedZoneIds = zones.map((z) => z.id);
  let amount = baseAmount;
  let lines = [...baseLines];
  let appliedFixedZoneId: string | null = null;
  const appliedZoneSurchargeIds: string[] = [];

  const fixedZone = [...zones]
    .filter((z) => typeof z.fixedTransferRate === "number")
    .sort((a, b) => b.priority - a.priority)[0];
  if (fixedZone && typeof fixedZone.fixedTransferRate === "number") {
    amount = fixedZone.fixedTransferRate;
    lines = [
      {
        id: lineId(),
        label: `${fixedZone.name} fixed rate`,
        amount,
        category: "zone_fixed",
        isInternal: true
      }
    ];
    appliedFixedZoneId = fixedZone.id;
  }

  for (const zone of zones) {
    if (typeof zone.flatSurcharge === "number" && zone.flatSurcharge !== 0) {
      amount += zone.flatSurcharge;
      appliedZoneSurchargeIds.push(zone.id);
      lines.push({
        id: lineId(),
        label: zone.name,
        amount: zone.flatSurcharge,
        category: "zone_surcharge",
        isInternal: true
      });
    }
  }

  return { amount, lines, matchedZoneIds, appliedFixedZoneId, appliedZoneSurchargeIds };
}

function ruleMatches(rule: PricingRule, pickupTime: PickupTimeContext): boolean {
  const { weekday, time, date } = pickupTime;

  if (rule.type === "peak_hours") {
    if (rule.weekdays?.length && !rule.weekdays.includes(weekday)) return false;
    if (rule.startTime && rule.endTime && !isTimeWithinRange(time, rule.startTime, rule.endTime)) {
      return false;
    }
    return true;
  }
  if (rule.type === "holiday") {
    return Boolean(rule.dates?.includes(date));
  }
  if (rule.type === "date_range") {
    if (!rule.startDate || !rule.endDate) return false;
    return date >= rule.startDate && date <= rule.endDate;
  }
  return false;
}

function applyTimeRuleLayer(
  amount: number,
  lines: QuoteLineItem[],
  pricing: PricingConfig,
  request: QuoteRequest,
  pickupTime: PickupTimeContext
): { amount: number; lines: QuoteLineItem[]; appliedRuleId: string | null } {
  if (request.tripType !== "transfer") {
    return { amount, lines, appliedRuleId: null };
  }

  const winner = pricing.rules
    .filter((rule) => rule.isEnabled && ruleMatches(rule, pickupTime))
    .sort((a, b) => b.priority - a.priority)[0];

  if (!winner) return { amount, lines, appliedRuleId: null };

  let nextAmount = amount;
  if (typeof winner.percentAdjustment === "number") {
    const adjustment = amount * winner.percentAdjustment;
    nextAmount += adjustment;
    lines = [
      ...lines,
      {
        id: lineId(),
        label: winner.name,
        amount: adjustment,
        category: "time_adjustment",
        isInternal: true
      }
    ];
  } else if (typeof winner.flatSurcharge === "number") {
    nextAmount += winner.flatSurcharge;
    lines = [
      ...lines,
      {
        id: lineId(),
        label: winner.name,
        amount: winner.flatSurcharge,
        category: "time_adjustment",
        isInternal: true
      }
    ];
  }

  return { amount: nextAmount, lines, appliedRuleId: winner.id };
}

function applyAddons(
  amount: number,
  lines: QuoteLineItem[],
  addons: PricingAddon[],
  request: QuoteRequest,
  selectedAddonIds: Set<string>
): { amount: number; lines: QuoteLineItem[] } {
  let nextAmount = amount;
  const nextLines = [...lines];
  for (const addon of addons) {
    if (!addon.isEnabled) continue;
    if (!selectedAddonIds.has(addon.id)) continue;
    if (!addon.tripTypes.includes(request.tripType)) continue;
    if (
      addon.vehicleClassIds.length > 0 &&
      !addon.vehicleClassIds.includes(request.vehicleClassId)
    ) {
      continue;
    }
    nextAmount += addon.price;
    nextLines.push({
      id: lineId(),
      label: addon.title,
      amount: addon.price,
      category: "addon",
      isInternal: false
    });
  }
  return { amount: nextAmount, lines: nextLines };
}

function applyTax(
  amount: number,
  lines: QuoteLineItem[],
  locale: OperatorLocale
): { subtotal: number; taxAmount: number; total: number; lines: QuoteLineItem[] } {
  if (locale.taxDisplayMode === "inclusive") {
    const total = amount;
    const taxAmount = total - total / (1 + locale.defaultTaxRate);
    const subtotal = total - taxAmount;
    return {
      subtotal,
      taxAmount,
      total,
      lines: [
        ...lines,
        {
          id: lineId(),
          label: locale.taxName,
          amount: taxAmount,
          category: "tax",
          isInternal: !locale.showTaxOnQuotes
        }
      ]
    };
  }

  const subtotal = amount;
  const taxAmount = subtotal * locale.defaultTaxRate;
  const total = subtotal + taxAmount;
  return {
    subtotal,
    taxAmount,
    total,
    lines: [
      ...lines,
      {
        id: lineId(),
        label: locale.taxName,
        amount: taxAmount,
        category: "tax",
        isInternal: !locale.showTaxOnQuotes
      }
    ]
  };
}

export function computeQuote(request: QuoteRequest, context: QuoteEngineContext): QuoteResult {
  if (request.tripType === "round_trip") {
    throw new QuoteError("Round trip must be quoted as separate point-to-point legs.");
  }
  if (request.tripType === "hourly" && (request.bookedHours == null || request.bookedHours <= 0)) {
    throw new QuoteError("Booked hours are required for hourly trips.");
  }

  const vehicleClass = requireVehicleClass(context.vehicleClass);
  if (vehicleClass.id !== request.vehicleClassId) {
    throw new QuoteError("Vehicle class does not match the quote request.");
  }
  const pickupTime: PickupTimeContext = {
    weekday: isoWeekdayInTimezone(request.scheduledPickupAt, context.locale.timezone),
    time: timeStringInTimezone(request.scheduledPickupAt, context.locale.timezone),
    date: dateStringInTimezone(request.scheduledPickupAt, context.locale.timezone)
  };
  const weekendWeekdays = new Set(context.pricing.weekendWeekdays);
  const selectedAddonIds = new Set(request.addonIds);
  const onboardUnits = metersToDistanceUnit(context.routeDistanceMeters, context.locale.distanceUnit);
  const deadheadUnits = metersToDistanceUnit(context.deadheadDistanceMeters, context.locale.distanceUnit);

  let baseAmount = 0;
  let lines: QuoteLineItem[] = [];

  if (request.tripType === "transfer") {
    const transfer = computeTransferBase(vehicleClass, onboardUnits, deadheadUnits);
    baseAmount = Math.max(context.pricing.minimumFare, transfer.amount);
    lines = transfer.lines;
    if (baseAmount > transfer.amount) {
      lines.push({
        id: lineId(),
        label: "Global minimum fare",
        amount: baseAmount - transfer.amount,
        category: "minimum",
        isInternal: true
      });
    }
  } else {
    const hourly = computeHourlyBase(
      vehicleClass,
      pickupTime.weekday,
      weekendWeekdays,
      request.bookedHours!,
      context.deadheadDurationMinutes
    );
    baseAmount = hourly.amount;
    lines = hourly.lines;
  }

  const zones = matchingZones(context.pricing, request.pickupPostcode, request.dropoffPostcode);
  const zoneResult = applyZoneLayer(baseAmount, lines, zones);
  let amount = zoneResult.amount;
  lines = zoneResult.lines;

  const timeResult = applyTimeRuleLayer(amount, lines, context.pricing, request, pickupTime);
  amount = timeResult.amount;
  lines = timeResult.lines;

  const addonResult = applyAddons(
    amount,
    lines,
    context.pricing.addons,
    request,
    selectedAddonIds
  );
  amount = addonResult.amount;
  lines = addonResult.lines;

  const taxed = applyTax(amount, lines, context.locale);
  const roundedTotal = roundTotal(taxed.total, context.pricing.quoteRounding);

  const snapshot: TripQuoteSnapshot = {
    schemaVersion: context.pricing.schemaVersion,
    tripType: request.tripType,
    vehicleClassId: request.vehicleClassId,
    garageLocationId: context.garageLocation.id,
    distanceUnit: context.locale.distanceUnit,
    currencyCode: context.locale.currency,
    onboardUnits,
    deadheadUnits,
    bookedHours: request.bookedHours,
    matchedZoneIds: zoneResult.matchedZoneIds,
    appliedFixedZoneId: zoneResult.appliedFixedZoneId,
    appliedZoneSurchargeIds: zoneResult.appliedZoneSurchargeIds,
    appliedRuleId: timeResult.appliedRuleId,
    addonIds: request.addonIds,
    pickupPostcode: request.pickupPostcode,
    dropoffPostcode: request.dropoffPostcode,
    scheduledPickupAt: request.scheduledPickupAt
  };

  return {
    subtotal: taxed.subtotal,
    taxAmount: taxed.taxAmount,
    total: roundedTotal,
    currencyCode: context.locale.currency,
    breakdown: taxed.lines,
    snapshot,
    displayTotal: roundedTotal,
    quotedPricesIncludeTax: context.locale.taxDisplayMode === "inclusive",
    quotedTaxRate: context.locale.defaultTaxRate
  };
}
