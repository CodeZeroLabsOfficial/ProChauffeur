"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// packages/pricing/src/index.ts
var index_exports = {};
__export(index_exports, {
  ConfigError: () => ConfigError,
  FEATURE_IDS: () => FEATURE_IDS,
  FEATURE_LABELS: () => FEATURE_LABELS,
  LICENSE_NOT_CONFIGURED_MESSAGE: () => LICENSE_NOT_CONFIGURED_MESSAGE,
  LOCATION_OPS_FEATURE_COPY: () => LOCATION_OPS_FEATURE_COPY,
  LOCATION_OPS_FEATURE_IDS: () => LOCATION_OPS_FEATURE_IDS,
  PLANS_NOT_CONFIGURED_MESSAGE: () => PLANS_NOT_CONFIGURED_MESSAGE,
  QuoteError: () => QuoteError,
  UNLIMITED: () => UNLIMITED,
  applyCorporateFixedRatesToVehicleClass: () => applyCorporateFixedRatesToVehicleClass,
  applyCorporatePercentOffLayer: () => applyCorporatePercentOffLayer,
  applyPromoDiscountLayer: () => applyPromoDiscountLayer,
  buildTripQuote: () => buildTripQuote,
  canAddDriver: () => canAddDriver,
  canCreateLocation: () => canCreateLocation,
  capLabel: () => capLabel,
  distanceUnitLabel: () => distanceUnitLabel,
  featureSource: () => featureSource,
  findCorporateFixedOverride: () => findCorporateFixedOverride,
  isFeatureEnabled: () => isFeatureEnabled,
  isFeatureFlagValue: () => isFeatureFlagValue,
  isFeatureId: () => isFeatureId,
  isLocationFeatureEnabled: () => isLocationFeatureEnabled,
  isMultiLocationEnabled: () => isMultiLocationEnabled,
  locationOpsFeatureField: () => locationOpsFeatureField,
  metersToDistanceUnit: () => metersToDistanceUnit,
  planLabel: () => planLabel,
  usagePercent: () => usagePercent
});
module.exports = __toCommonJS(index_exports);

// packages/pricing/src/license.ts
var FEATURE_IDS = [
  "autoDispatch",
  "bookingValidation",
  "driverRatings",
  "dynamicPricing",
  "loyaltyPromos",
  "corporateAccounts"
];
var LOCATION_OPS_FEATURE_IDS = [
  "autoDispatch",
  "dynamicPricing",
  "bookingValidation"
];
var LOCATION_OPS_FEATURE_COPY = {
  autoDispatch: {
    title: "Auto-Dispatch",
    description: "Automatically assign incoming jobs to the nearest available chauffeur with the right vehicle."
  },
  dynamicPricing: {
    title: "Dynamic pricing",
    description: "Adjust fares from demand and time of day."
  },
  bookingValidation: {
    title: "Booking validation",
    description: "Block bookings outside hours or service rules."
  }
};
var FEATURE_LABELS = {
  autoDispatch: "Auto-Dispatch",
  bookingValidation: "Booking Validation",
  driverRatings: "Driver ratings",
  dynamicPricing: "Dynamic trip pricing",
  loyaltyPromos: "Loyalty & promotional tools",
  corporateAccounts: "Accounts"
};
var UNLIMITED = Number.MAX_SAFE_INTEGER;
var LICENSE_NOT_CONFIGURED_MESSAGE = "This workspace doesn\u2019t have an active licence. Contact your provider to finish setup.";
var PLANS_NOT_CONFIGURED_MESSAGE = "This workspace doesn\u2019t have an active plan. Contact your provider to finish setup.";
function isFeatureId(value) {
  return FEATURE_IDS.includes(value);
}
function isFeatureFlagValue(value) {
  return value === "inherit" || value === "forceOn" || value === "forceOff";
}
function planIncludes(catalog, planId, feature) {
  const id = planId.trim() || catalog.defaultPlanId;
  const plan = catalog.plans[id];
  if (!plan) return false;
  return plan.features.includes(feature);
}
function isFeatureEnabled(license, catalog, feature) {
  const flag = license.featureFlags[feature] ?? "inherit";
  if (flag === "forceOff") return false;
  if (flag === "forceOn") return true;
  return planIncludes(catalog, license.planId, feature);
}
function locationOpsFeatureField(feature) {
  switch (feature) {
    case "autoDispatch":
      return "autoDispatchEnabled";
    case "dynamicPricing":
      return "dynamicPricingEnabled";
    case "bookingValidation":
      return "bookingValidationEnabled";
  }
}
function isLocationFeatureEnabled(license, catalog, flags, feature) {
  if (!isFeatureEnabled(license, catalog, feature)) return false;
  return flags[locationOpsFeatureField(feature)] === true;
}
function featureSource(license, catalog, feature) {
  const flag = license.featureFlags[feature] ?? "inherit";
  if (flag === "forceOff") return "disabled";
  if (flag === "forceOn") return "addon";
  if (planIncludes(catalog, license.planId, feature)) return "plan";
  return "not_included";
}
function planLabel(license, catalog) {
  const id = license.planId.trim();
  if (id && catalog.plans[id]?.label) return catalog.plans[id].label;
  if (catalog.defaultPlanId && catalog.plans[catalog.defaultPlanId]?.label) {
    return catalog.plans[catalog.defaultPlanId].label;
  }
  return "";
}
function isMultiLocationEnabled(maxLocations) {
  return maxLocations > 1;
}
function canCreateLocation(used, maxLocations) {
  if (maxLocations >= UNLIMITED) return true;
  return used < maxLocations;
}
function canAddDriver(used, maxDrivers) {
  if (maxDrivers >= UNLIMITED) return true;
  return used < maxDrivers;
}
function capLabel(value) {
  return value >= UNLIMITED ? "Unlimited" : String(value);
}
function usagePercent(used, max) {
  if (max >= UNLIMITED || max <= 0) return 0;
  return Math.min(100, Math.round(used / max * 100));
}

// packages/pricing/src/errors.ts
var ConfigError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigError";
  }
};
var QuoteError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "QuoteError";
  }
};

// packages/pricing/src/distance.ts
var METERS_PER_KM = 1e3;
var METERS_PER_MILE = 1609.344;
function metersToDistanceUnit(meters, unit) {
  if (!Number.isFinite(meters) || meters < 0) return 0;
  return unit === "mile" ? meters / METERS_PER_MILE : meters / METERS_PER_KM;
}
function distanceUnitLabel(unit) {
  return unit === "mile" ? "mile" : "km";
}

// packages/pricing/src/apply-corporate-rate.ts
function findCorporateFixedOverride(account, vehicleClassId, tripType) {
  if (account.rateMode !== "fixedRates") return null;
  return account.fixedRates.find(
    (row) => row.vehicleClassId === vehicleClassId && row.tripType === tripType
  ) ?? null;
}
function applyCorporateFixedRatesToVehicleClass(vehicleClass, override) {
  if (!override) return vehicleClass;
  const transfer = {
    ...vehicleClass.transfer,
    ...override.transfer ?? {}
  };
  const hourly = {
    ...vehicleClass.hourly,
    ...override.hourly ?? {}
  };
  return { ...vehicleClass, transfer, hourly };
}
function applyCorporatePercentOffLayer(amount, lines, account, lineId2) {
  if (!account || account.rateMode !== "percentOff") return { amount, lines };
  const percent = account.percentOff ?? 0;
  if (percent <= 0) return { amount, lines };
  const discount = Math.round(amount * percent * 100) / 100;
  if (discount <= 0) return { amount, lines };
  const pctLabel = Math.round(percent * 1e4) / 100;
  return {
    amount: Math.max(0, Math.round((amount - discount) * 100) / 100),
    lines: [
      ...lines,
      {
        id: lineId2(),
        label: `Corporate rate (\u2212${pctLabel}%)`,
        amount: -discount,
        category: "discount",
        isInternal: false
      }
    ]
  };
}

// lib/models/promotion.ts
function computePromoDiscountAmount(promo, amount) {
  if (amount <= 0 || promo.value <= 0) return 0;
  const raw = promo.type === "percent" ? amount * promo.value : Math.min(promo.value, amount);
  return Math.min(amount, Math.max(0, Math.round(raw * 100) / 100));
}

// packages/pricing/src/apply-promo.ts
function applyPromoDiscountLayer(amount, lines, applied, lineId2) {
  if (!applied) return { amount, lines };
  const discount = computePromoDiscountAmount(applied, amount);
  if (discount <= 0) return { amount, lines };
  return {
    amount: Math.max(0, Math.round((amount - discount) * 100) / 100),
    lines: [
      ...lines,
      {
        id: lineId2(),
        label: applied.title || applied.code || "Promo",
        amount: -discount,
        category: "discount",
        isInternal: false
      }
    ]
  };
}

// lib/models/enums.ts
var PRICING_WEEKEND_WEEKDAYS = [6, 7];

// packages/pricing/src/quote-engine.ts
function lineId() {
  return crypto.randomUUID();
}
function isoWeekdayInTimezone(date, timeZone) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short"
  }).format(date);
  const map = {
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
function timeStringInTimezone(date, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}
function parseTimeToMinutes(value) {
  const [h, m] = value.split(":").map((part) => parseInt(part, 10));
  return (h ?? 0) * 60 + (m ?? 0);
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
    day: "2-digit"
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
  const distanceCharge = deadheadUnits * rates.deadheadRatePerUnit + onboardUnits * rates.tripRatePerUnit;
  const raw = rates.baseFare + distanceCharge + rates.returnToBaseFee;
  const amount = Math.max(rates.minimumBaseRate, raw);
  const lines = [
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
function computeHourlyBase(vehicleClass, weekday, weekendWeekdays, bookedHours, deadheadDurationMinutes) {
  const rates = vehicleClass.hourly;
  const isWeekend = weekendWeekdays.has(weekday);
  const hourlyRate = isWeekend ? rates.weekendHourlyRate : rates.weekdayHourlyRate;
  const minimumHours = isWeekend ? rates.weekendMinimumHours : rates.weekdayMinimumHours;
  const billableHours = Math.max(minimumHours, bookedHours);
  const chargeableDeadhead = Math.max(0, deadheadDurationMinutes - rates.freeDeadheadMinutes);
  const deadheadCharge = chargeableDeadhead / 60 * rates.deadheadRatePerMinute;
  const amount = billableHours * hourlyRate + deadheadCharge;
  const lines = [
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
function normalizedZonePostcodes(zone) {
  const postcodes = zone.match.postcodes ?? [];
  return new Set(postcodes.map((p) => p.trim().toUpperCase()));
}
function zoneMatchesPostcode(normalized, pickupPostcode, dropoffPostcode) {
  const pickup = pickupPostcode.trim().toUpperCase();
  const dropoff = dropoffPostcode.trim().toUpperCase();
  return pickup.length > 0 && normalized.has(pickup) || dropoff.length > 0 && normalized.has(dropoff);
}
function matchingZones(pricing, pickupPostcode, dropoffPostcode) {
  const matched = [];
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
function applyZoneLayer(baseAmount, baseLines, zones) {
  const matchedZoneIds = zones.map((z) => z.id);
  let amount = baseAmount;
  let lines = [...baseLines];
  let appliedFixedZoneId = null;
  const appliedZoneSurchargeIds = [];
  const fixedZone = [...zones].filter((z) => typeof z.fixedTransferRate === "number").sort((a, b) => b.priority - a.priority)[0];
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
function ruleMatches(rule, pickupTime) {
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
function applyTimeRuleLayer(amount, lines, pricing, request, pickupTime) {
  if (request.tripType !== "transfer") {
    return { amount, lines, appliedRuleId: null };
  }
  const winner = pricing.rules.filter((rule) => rule.isEnabled && ruleMatches(rule, pickupTime)).sort((a, b) => b.priority - a.priority)[0];
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
function applyAddons(amount, lines, addons, request, selectedAddonIds) {
  let nextAmount = amount;
  const nextLines = [...lines];
  for (const addon of addons) {
    if (!addon.isEnabled) continue;
    if (!selectedAddonIds.has(addon.id)) continue;
    if (!addon.tripTypes.includes(request.tripType)) continue;
    if (addon.vehicleClassIds.length > 0 && !addon.vehicleClassIds.includes(request.vehicleClassId)) {
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
function applyTax(amount, lines, locale) {
  if (locale.taxDisplayMode === "inclusive") {
    const total2 = amount;
    const taxAmount2 = total2 - total2 / (1 + locale.defaultTaxRate);
    const subtotal2 = total2 - taxAmount2;
    return {
      subtotal: subtotal2,
      taxAmount: taxAmount2,
      total: total2,
      lines: [
        ...lines,
        {
          id: lineId(),
          label: locale.taxName,
          amount: taxAmount2,
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
function buildTripQuote(request, context) {
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
  const fixedOverride = corporate && corporate.status === "active" ? findCorporateFixedOverride(corporate, request.vehicleClassId, request.tripType) : null;
  const vehicleClass = applyCorporateFixedRatesToVehicleClass(vehicleClassRaw, fixedOverride);
  const pickupTime = {
    weekday: isoWeekdayInTimezone(request.scheduledPickupAt, context.locale.timezone),
    time: timeStringInTimezone(request.scheduledPickupAt, context.locale.timezone),
    date: dateStringInTimezone(request.scheduledPickupAt, context.locale.timezone)
  };
  const weekendWeekdays = new Set(PRICING_WEEKEND_WEEKDAYS);
  const selectedAddonIds = new Set(request.addonIds);
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
  if (request.tripType === "transfer" && fixedOverride?.fixedTransferRate != null && fixedOverride.fixedTransferRate > 0) {
    baseAmount = fixedOverride.fixedTransferRate;
    lines = [
      {
        id: lineId(),
        label: "Corporate fixed transfer",
        amount: baseAmount,
        category: "base",
        isInternal: false
      }
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
        isInternal: true
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
  const timeResult = context.dynamicPricingActive ? applyTimeRuleLayer(amount, lines, context.pricing, request, pickupTime) : { amount, lines, appliedRuleId: null };
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
  if (useCorporateRates && corporate?.rateMode === "percentOff") {
    const corpResult = applyCorporatePercentOffLayer(amount, lines, corporate, lineId);
    amount = corpResult.amount;
    lines = corpResult.lines;
  }
  const appliedPromo = useCorporateRates ? null : request.appliedPromo ?? null;
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
    addonIds: request.addonIds,
    appliedPromoId: appliedPromo?.id ?? null,
    promoCode: appliedPromo?.code ?? null,
    corporateAccountId: useCorporateRates ? corporate.id : null,
    corporateRateMode: useCorporateRates ? corporate.rateMode : null,
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ConfigError,
  FEATURE_IDS,
  FEATURE_LABELS,
  LICENSE_NOT_CONFIGURED_MESSAGE,
  LOCATION_OPS_FEATURE_COPY,
  LOCATION_OPS_FEATURE_IDS,
  PLANS_NOT_CONFIGURED_MESSAGE,
  QuoteError,
  UNLIMITED,
  applyCorporateFixedRatesToVehicleClass,
  applyCorporatePercentOffLayer,
  applyPromoDiscountLayer,
  buildTripQuote,
  canAddDriver,
  canCreateLocation,
  capLabel,
  distanceUnitLabel,
  featureSource,
  findCorporateFixedOverride,
  isFeatureEnabled,
  isFeatureFlagValue,
  isFeatureId,
  isLocationFeatureEnabled,
  isMultiLocationEnabled,
  locationOpsFeatureField,
  metersToDistanceUnit,
  planLabel,
  usagePercent
});
