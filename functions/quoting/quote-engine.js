const { randomUUID } = require("crypto");
const { applyPromoDiscountLayer } = require("./apply-promo");
const {
  applyCorporateFixedRatesToVehicleClass,
  applyCorporatePercentOffLayer,
  findCorporateFixedOverride,
} = require("./apply-corporate-rate");
const { metersToDistanceUnit } = require("./distance");

class QuoteError extends Error {
  constructor(message) {
    super(message);
    this.name = "QuoteError";
  }
}

function lineId() {
  return randomUUID();
}

function isoWeekdayInTimezone(date, timeZone) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const map = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekday] ?? 1;
}

function timeStringInTimezone(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function parseTimeToMinutes(value) {
  const parts = value.split(":").map((part) => parseInt(part, 10));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

function isTimeWithinRange(now, start, end) {
  const current = parseTimeToMinutes(now);
  const from = parseTimeToMinutes(start);
  const to = parseTimeToMinutes(end);
  if (from <= to) return current >= from && current < to;
  return current >= from || current < to;
}

function dateStringInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function roundTotal(total, mode) {
  if (mode === "dollar") return Math.round(total);
  if (mode === "half_dollar") return Math.round(total * 2) / 2;
  return Math.round(total * 100) / 100;
}

function requireVehicleClass(vehicleClass) {
  if (!vehicleClass.isEnabled) {
    throw new QuoteError(`Vehicle class "${vehicleClass.displayName}" is not enabled.`);
  }
  return vehicleClass;
}

function computeTransferBase(vehicleClass, onboardUnits, deadheadUnits) {
  const rates = vehicleClass.transfer;
  const distanceCharge =
    deadheadUnits * rates.deadheadRatePerUnit + onboardUnits * rates.tripRatePerUnit;
  const raw = rates.baseFare + distanceCharge + rates.returnToBaseFee;
  const amount = Math.max(rates.minimumBaseRate, raw);
  const lines = [
    {
      id: lineId(),
      label: "Base fare",
      amount: rates.baseFare,
      category: "base",
      isInternal: true,
    },
  ];
  if (deadheadUnits > 0) {
    lines.push({
      id: lineId(),
      label: "Deadhead",
      amount: deadheadUnits * rates.deadheadRatePerUnit,
      category: "deadhead",
      isInternal: true,
    });
  }
  if (onboardUnits > 0) {
    lines.push({
      id: lineId(),
      label: "Distance",
      amount: onboardUnits * rates.tripRatePerUnit,
      category: "distance",
      isInternal: true,
    });
  }
  if (amount > raw) {
    lines.push({
      id: lineId(),
      label: "Minimum fare",
      amount: amount - raw,
      category: "minimum",
      isInternal: true,
    });
  }
  return { amount, lines };
}

function computeHourlyBase(
  vehicleClass,
  weekday,
  weekendWeekdays,
  bookedHours,
  deadheadDurationMinutes
) {
  const rates = vehicleClass.hourly;
  const isWeekend = weekendWeekdays.has(weekday);
  const hourlyRate = isWeekend ? rates.weekendHourlyRate : rates.weekdayHourlyRate;
  const minimumHours = isWeekend ? rates.weekendMinimumHours : rates.weekdayMinimumHours;
  const billableHours = Math.max(minimumHours, bookedHours);
  const chargeableDeadhead = Math.max(0, deadheadDurationMinutes - rates.freeDeadheadMinutes);
  const deadheadCharge = (chargeableDeadhead / 60) * rates.deadheadRatePerMinute;
  const amount = billableHours * hourlyRate + deadheadCharge;
  const lines = [
    {
      id: lineId(),
      label: `${billableHours} hr @ ${hourlyRate}`,
      amount: billableHours * hourlyRate,
      category: "hourly",
      isInternal: true,
    },
  ];
  if (deadheadCharge > 0) {
    lines.push({
      id: lineId(),
      label: "Deadhead time",
      amount: deadheadCharge,
      category: "deadhead",
      isInternal: true,
    });
  }
  if (billableHours > bookedHours) {
    lines.push({
      id: lineId(),
      label: "Minimum hours",
      amount: 0,
      category: "minimum",
      isInternal: true,
    });
  }
  return { amount, lines };
}

function normalizedZonePostcodes(zone) {
  const postcodes = (zone.match && zone.match.postcodes) || [];
  return new Set(postcodes.map((p) => String(p).trim().toUpperCase()));
}

function zoneMatchesPostcode(normalized, pickupPostcode, dropoffPostcode) {
  const pickup = String(pickupPostcode || "").trim().toUpperCase();
  const dropoff = String(dropoffPostcode || "").trim().toUpperCase();
  return (
    (pickup.length > 0 && normalized.has(pickup)) ||
    (dropoff.length > 0 && normalized.has(dropoff))
  );
}

function matchingZones(pricing, pickupPostcode, dropoffPostcode) {
  const matched = [];
  const zones = Array.isArray(pricing.zones) ? pricing.zones : [];
  for (const zone of zones) {
    if (!zone.isEnabled) continue;
    if (!zone.match || zone.match.type !== "postcode") continue;
    const normalized = normalizedZonePostcodes(zone);
    if (zoneMatchesPostcode(normalized, pickupPostcode, dropoffPostcode)) {
      matched.push(zone);
    }
  }
  return matched;
}

function applyZoneLayer(baseAmount, baseLines, zones) {
  const matchedZoneIds = zones.map((z) => z.id);
  let amount = baseAmount;
  let lines = [...baseLines];
  let appliedFixedZoneId = null;
  const appliedZoneSurchargeIds = [];

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
        isInternal: true,
      },
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
        isInternal: true,
      });
    }
  }

  return { amount, lines, matchedZoneIds, appliedFixedZoneId, appliedZoneSurchargeIds };
}

function ruleMatches(rule, pickupTime) {
  const { weekday, time, date } = pickupTime;

  if (rule.type === "peak_hours") {
    if (rule.weekdays && rule.weekdays.length && !rule.weekdays.includes(weekday)) {
      return false;
    }
    if (rule.startTime && rule.endTime && !isTimeWithinRange(time, rule.startTime, rule.endTime)) {
      return false;
    }
    return true;
  }
  if (rule.type === "holiday") {
    return Boolean(rule.dates && rule.dates.includes(date));
  }
  if (rule.type === "date_range") {
    if (!rule.startDate || !rule.endDate) return false;
    return date >= rule.startDate && date <= rule.endDate;
  }
  return false;
}

function applyTimeRuleLayer(amount, lines, pricing, request, pickupTime) {
  if (request.tripType !== "transfer") {
    return { amount, lines, appliedRuleId: null };
  }

  const rules = Array.isArray(pricing.rules) ? pricing.rules : [];
  const winner = rules
    .filter((rule) => rule.isEnabled && ruleMatches(rule, pickupTime))
    .sort((a, b) => b.priority - a.priority)[0];

  if (!winner) return { amount, lines, appliedRuleId: null };

  let nextAmount = amount;
  let nextLines = lines;
  if (typeof winner.percentAdjustment === "number") {
    const adjustment = amount * winner.percentAdjustment;
    nextAmount += adjustment;
    nextLines = [
      ...lines,
      {
        id: lineId(),
        label: winner.name,
        amount: adjustment,
        category: "time_adjustment",
        isInternal: true,
      },
    ];
  } else if (typeof winner.flatSurcharge === "number") {
    nextAmount += winner.flatSurcharge;
    nextLines = [
      ...lines,
      {
        id: lineId(),
        label: winner.name,
        amount: winner.flatSurcharge,
        category: "time_adjustment",
        isInternal: true,
      },
    ];
  }

  return { amount: nextAmount, lines: nextLines, appliedRuleId: winner.id };
}

function applyAddons(amount, lines, addons, request, selectedAddonIds) {
  let nextAmount = amount;
  const nextLines = [...lines];
  const list = Array.isArray(addons) ? addons : [];
  for (const addon of list) {
    if (!addon.isEnabled) continue;
    if (!selectedAddonIds.has(addon.id)) continue;
    if (!Array.isArray(addon.tripTypes) || !addon.tripTypes.includes(request.tripType)) continue;
    if (
      Array.isArray(addon.vehicleClassIds) &&
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
      isInternal: false,
    });
  }
  return { amount: nextAmount, lines: nextLines };
}

function applyTax(amount, lines, locale) {
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
          isInternal: !locale.showTaxOnQuotes,
        },
      ],
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
        isInternal: !locale.showTaxOnQuotes,
      },
    ],
  };
}

function computeQuote(request, context) {
  if (request.tripType === "round_trip") {
    throw new QuoteError("Round trip must be quoted as separate point-to-point legs.");
  }
  if (request.tripType === "hourly" && (request.bookedHours == null || request.bookedHours <= 0)) {
    throw new QuoteError("Booked hours are required for hourly trips.");
  }

  const vehicleClassRaw = requireVehicleClass(context.vehicleClass);
  if (vehicleClassRaw.id !== request.vehicleClassId) {
    throw new QuoteError("Vehicle class does not match the quote request.");
  }

  const corporate = request.corporateAccount ?? null;
  const fixedOverride =
    corporate && corporate.status === "active"
      ? findCorporateFixedOverride(corporate, request.vehicleClassId, request.tripType)
      : null;
  const vehicleClass = applyCorporateFixedRatesToVehicleClass(vehicleClassRaw, fixedOverride);

  const pickupTime = {
    weekday: isoWeekdayInTimezone(request.scheduledPickupAt, context.locale.timezone),
    time: timeStringInTimezone(request.scheduledPickupAt, context.locale.timezone),
    date: dateStringInTimezone(request.scheduledPickupAt, context.locale.timezone),
  };
  const weekendWeekdays = new Set([6, 7]); // Sat–Sun (Mon=1 … Sun=7)
  const selectedAddonIds = new Set(request.addonIds || []);
  const onboardUnits = metersToDistanceUnit(
    context.routeDistanceMeters,
    context.locale.distanceUnit
  );
  const deadheadUnits = metersToDistanceUnit(
    context.deadheadDistanceMeters,
    context.locale.distanceUnit
  );

  let baseAmount = 0;
  let lines = [];

  if (
    request.tripType === "transfer" &&
    fixedOverride &&
    fixedOverride.fixedTransferRate != null &&
    fixedOverride.fixedTransferRate > 0
  ) {
    baseAmount = fixedOverride.fixedTransferRate;
    lines = [
      {
        id: lineId(),
        label: "Corporate fixed transfer",
        amount: baseAmount,
        category: "base",
        isInternal: false,
      },
    ];
  } else if (request.tripType === "transfer") {
    const transfer = computeTransferBase(vehicleClass, onboardUnits, deadheadUnits);
    baseAmount = Math.max(context.pricing.minimumFare, transfer.amount);
    lines = transfer.lines;
    if (baseAmount > transfer.amount) {
      lines.push({
        id: lineId(),
        label: "Global minimum fare",
        amount: baseAmount - transfer.amount,
        category: "minimum",
        isInternal: true,
      });
    }
  } else {
    const hourly = computeHourlyBase(
      vehicleClass,
      pickupTime.weekday,
      weekendWeekdays,
      request.bookedHours,
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

  const useCorporateRates = Boolean(corporate && corporate.status === "active");
  if (useCorporateRates && corporate.rateMode === "percentOff") {
    const corpResult = applyCorporatePercentOffLayer(amount, lines, corporate, lineId);
    amount = corpResult.amount;
    lines = corpResult.lines;
  }

  // Corporate rates do not stack with promo codes.
  const appliedPromo = useCorporateRates ? null : (request.appliedPromo ?? null);
  const promoResult = applyPromoDiscountLayer(amount, lines, appliedPromo, lineId);
  amount = promoResult.amount;
  lines = promoResult.lines;

  const taxed = applyTax(amount, lines, context.locale);
  const roundedTotal = roundTotal(taxed.total, context.pricing.quoteRounding);

  const snapshot = {
    schemaVersion: context.pricing.schemaVersion,
    tripType: request.tripType,
    vehicleClassId: request.vehicleClassId,
    officeLocationId: context.officeLocation.id,
    distanceUnit: context.locale.distanceUnit,
    currencyCode: context.locale.currency,
    onboardUnits,
    deadheadUnits,
    bookedHours: request.bookedHours,
    matchedZoneIds: zoneResult.matchedZoneIds,
    appliedFixedZoneId: zoneResult.appliedFixedZoneId,
    appliedZoneSurchargeIds: zoneResult.appliedZoneSurchargeIds,
    appliedRuleId: timeResult.appliedRuleId,
    addonIds: request.addonIds || [],
    appliedPromoId: appliedPromo ? appliedPromo.id : null,
    promoCode: appliedPromo ? appliedPromo.code : null,
    corporateAccountId: useCorporateRates ? corporate.id : null,
    corporateRateMode: useCorporateRates ? corporate.rateMode : null,
    pickupPostcode: request.pickupPostcode,
    dropoffPostcode: request.dropoffPostcode,
    scheduledPickupAt: request.scheduledPickupAt,
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
    quotedTaxRate: context.locale.defaultTaxRate,
  };
}

module.exports = {
  computeQuote,
  QuoteError,
};
