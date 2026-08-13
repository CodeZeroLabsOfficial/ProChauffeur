const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { Collections } = require("../lib/collections");
const { requireAuth } = require("../lib/auth");
const { resolveBookingBranchId } = require("../lib/resolve-branch");
const {
  isFeatureEnabled,
  loadLicenseAndPlans,
} = require("../lib/license");
const { computeQuote, QuoteError } = require("../quoting/quote-engine");
const { fetchRouteMetrics } = require("../quoting/mapbox-directions");
const { getMapboxToken } = require("../quoting/mapbox-token");
const { extractPostcodeFromAddress } = require("../lib/resolve-branch");

const ALLOWED_SETTLEMENTS = new Set(["on_account", "card"]);

function hasValidCoordinate(latitude, longitude) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    (latitude !== 0 || longitude !== 0)
  );
}

function normalizeAllowedPaymentMethods(raw) {
  const fromArray = Array.isArray(raw)
    ? raw.filter((v) => v === "card" || v === "on_account")
    : [];
  const unique = [...new Set(fromArray)];
  return unique.length > 0 ? unique : ["on_account"];
}

function normalizePromoCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** Addon ids selected for the leg, from `journey.bookingAddons`. */
function extractAddonIds(journey) {
  if (!journey || typeof journey !== "object") return [];
  if (Array.isArray(journey.addonIds)) {
    return journey.addonIds.filter((id) => typeof id === "string" && id.trim());
  }
  if (!Array.isArray(journey.bookingAddons)) return [];
  return journey.bookingAddons
    .map((a) => (a && typeof a.id === "string" ? a.id : null))
    .filter(Boolean);
}

function requireCoord(label, value) {
  if (!value || typeof value !== "object") {
    throw new HttpsError("invalid-argument", `${label} is required.`);
  }
  const latitude = value.lat != null ? Number(value.lat) : Number(value.latitude);
  const longitude = value.lng != null ? Number(value.lng) : Number(value.longitude);
  if (!hasValidCoordinate(latitude, longitude)) {
    throw new HttpsError("invalid-argument", `${label} coordinates are invalid.`);
  }
  return { latitude, longitude };
}

function mapCorporateAccount(id, d) {
  const data = d || {};
  const preferredPayment =
    data.preferredPayment === "card" || data.preferredPayment === "on_account"
      ? data.preferredPayment
      : null;
  const allowedPaymentMethods = normalizeAllowedPaymentMethods(
    data.allowedPaymentMethods
  );
  const allowedVehicleClassIds = Array.isArray(data.allowedVehicleClassIds)
    ? [
        ...new Set(
          data.allowedVehicleClassIds.filter(
            (v) => typeof v === "string" && v.trim() !== ""
          )
        ),
      ]
    : [];
  const rateMode = data.rateMode === "fixedRates" ? "fixedRates" : "percentOff";
  const fixedRates = Array.isArray(data.fixedRates) ? data.fixedRates : [];
  return {
    id,
    name: typeof data.name === "string" ? data.name : "",
    status: data.status === "suspended" ? "suspended" : "active",
    rateMode,
    percentOff: typeof data.percentOff === "number" ? data.percentOff : null,
    fixedRates,
    allowedPaymentMethods,
    allowedVehicleClassIds,
    preferredPayment: allowedPaymentMethods.includes(preferredPayment)
      ? preferredPayment
      : null,
  };
}

function mapVehicleClassInclusion(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  const value = typeof raw.value === "string" ? raw.value.trim() : "";
  if (!id || !label || !value) return null;
  return { id, label, value };
}

function mapVehicleClass(id, d) {
  const data = d || {};
  const inclusions = Array.isArray(data.inclusions)
    ? data.inclusions.map(mapVehicleClassInclusion).filter(Boolean)
    : [];
  return {
    id,
    slug: id,
    displayName: data.displayName || id,
    sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
    serviceTier:
      typeof data.serviceTier === "string" && data.serviceTier.trim()
        ? data.serviceTier.trim()
        : "Business",
    bodyType:
      typeof data.bodyType === "string" && data.bodyType.trim()
        ? data.bodyType.trim()
        : "Sedan",
    capacity: {
      passengerCount: data.capacity?.passengerCount ?? 4,
      luggage: {
        smallCount: data.capacity?.luggage?.smallCount ?? 0,
        largeCount: data.capacity?.luggage?.largeCount ?? 0,
      },
    },
    inclusions,
    description: data.description ?? null,
    imageUrl: data.imageUrl ?? null,
    isEnabled: data.isEnabled !== false,
    isVisible: data.isVisible !== false,
    supportedTripTypes: Array.isArray(data.supportedTripTypes)
      ? data.supportedTripTypes
      : ["transfer", "hourly"],
    transfer: data.transfer || {},
    hourly: data.hourly || {},
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function mapPricingConfig(d) {
  const data = d || {};
  return {
    schemaVersion: typeof data.schemaVersion === "number" ? data.schemaVersion : 2,
    minimumFare: typeof data.minimumFare === "number" ? data.minimumFare : 0,
    weekendWeekdays: [6, 7],
    quoteRounding: data.quoteRounding || "none",
    addons: Array.isArray(data.addons) ? data.addons : [],
    zones: Array.isArray(data.zones) ? data.zones : [],
    rules: Array.isArray(data.rules) ? data.rules : [],
  };
}

function requireString(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError(
      "failed-precondition",
      `Locale is not configured for this Location (${field}).`
    );
  }
  return value.trim();
}

function mapOperatorLocale(d) {
  if (!d || typeof d !== "object") {
    throw new HttpsError(
      "failed-precondition",
      "Locale is not configured for this Location."
    );
  }
  if (d.distanceUnit !== "km" && d.distanceUnit !== "mile") {
    throw new HttpsError(
      "failed-precondition",
      "Locale is not configured for this Location (distanceUnit)."
    );
  }
  if (typeof d.defaultTaxRate !== "number" || !Number.isFinite(d.defaultTaxRate) || d.defaultTaxRate < 0) {
    throw new HttpsError(
      "failed-precondition",
      "Locale is not configured for this Location (defaultTaxRate)."
    );
  }
  if (d.taxDisplayMode !== "inclusive" && d.taxDisplayMode !== "exclusive") {
    throw new HttpsError(
      "failed-precondition",
      "Locale is not configured for this Location (taxDisplayMode)."
    );
  }
  if (typeof d.showTaxOnQuotes !== "boolean") {
    throw new HttpsError(
      "failed-precondition",
      "Locale is not configured for this Location (showTaxOnQuotes)."
    );
  }
  if (typeof d.driverLicenceCountry !== "string" || !d.driverLicenceCountry.trim()) {
    throw new HttpsError(
      "failed-precondition",
      "Locale is not configured for this Location (driverLicenceCountry)."
    );
  }
  return {
    locale: requireString(d.locale, "locale"),
    currency: requireString(d.currency, "currency").toUpperCase(),
    timezone: requireString(d.timezone, "timezone"),
    distanceUnit: d.distanceUnit,
    defaultTaxRate: d.defaultTaxRate,
    taxName: requireString(d.taxName, "taxName"),
    taxDisplayMode: d.taxDisplayMode,
    showTaxOnQuotes: d.showTaxOnQuotes,
    driverLicenceCountry: d.driverLicenceCountry.trim(),
  };
}

function findDefaultOffice(locations) {
  const defaults = locations.filter(
    (l) => l.isDefault === true && hasValidCoordinate(l.latitude, l.longitude)
  );
  if (defaults.length === 0) {
    throw new HttpsError(
      "failed-precondition",
      "No default office configured. Set the office address in Locations."
    );
  }
  if (defaults.length > 1) {
    throw new HttpsError(
      "failed-precondition",
      "Multiple default offices configured. Only one is allowed."
    );
  }
  return defaults[0];
}

async function requireRouteMetrics(from, to, token) {
  const metrics = await fetchRouteMetrics(from, to, token);
  if (!metrics) {
    throw new HttpsError("failed-precondition", "Could not calculate route distance.");
  }
  return metrics;
}

async function loadAppliedPromo(db, promoCode) {
  const code = normalizePromoCode(promoCode);
  if (!code) return null;
  const snap = await db
    .collection("promotions")
    .where("code", "==", code)
    .limit(1)
    .get();
  if (snap.empty) {
    throw new HttpsError("not-found", "Promo code not found.");
  }
  const doc = snap.docs[0];
  const data = doc.data() || {};
  if (data.isEnabled === false) {
    throw new HttpsError("failed-precondition", "Promo code is not active.");
  }
  const type = data.type === "fixed" ? "fixed" : "percent";
  const value = typeof data.value === "number" ? data.value : 0;
  if (value <= 0) {
    throw new HttpsError("failed-precondition", "Promo code has no discount value.");
  }
  return {
    id: doc.id,
    title: typeof data.title === "string" ? data.title : "",
    code: typeof data.code === "string" ? data.code : code,
    type,
    value,
  };
}

function serializeQuoteResult(result) {
  const scheduled = result.snapshot.scheduledPickupAt;
  const scheduledIso =
    scheduled instanceof Date
      ? scheduled.toISOString()
      : scheduled && typeof scheduled.toDate === "function"
        ? scheduled.toDate().toISOString()
        : scheduled
          ? new Date(scheduled).toISOString()
          : null;
  return {
    ...result,
    snapshot: {
      ...result.snapshot,
      scheduledPickupAt: scheduledIso,
    },
  };
}

/**
 * Core quote computation used by the callable and booking payment re-quote.
 * @param {FirebaseFirestore.Firestore} db
 * @param {{
 *   customerId: string,
 *   settlement: string,
 *   trip: { journey: object, quote: object },
 *   branchIdHint?: string|null,
 *   promoCode?: string|null
 * }} args `trip` is a nested payload mirroring the Trip document's
 *   `journey` / `quote` maps.
 */
async function runComputeQuote(db, {
  customerId,
  settlement,
  trip,
  branchIdHint = null,
  promoCode = null,
}) {
  const journey = trip?.journey && typeof trip.journey === "object" ? trip.journey : {};
  const quote = trip?.quote && typeof trip.quote === "object" ? trip.quote : {};

  const tripType = journey.tripType;
  if (tripType !== "transfer" && tripType !== "hourly") {
    throw new HttpsError("invalid-argument", "trip.journey.tripType must be transfer or hourly.");
  }

  const vehicleClassId =
    typeof quote.vehicleClassId === "string" ? quote.vehicleClassId.trim() : "";
  if (!vehicleClassId) {
    throw new HttpsError("invalid-argument", "trip.quote.vehicleClassId is required.");
  }

  const pickup = requireCoord("pickup", journey.pickup);
  const dropoff = requireCoord("dropoff", journey.dropoff);

  const pickupAddressLine =
    typeof journey.pickupAddressLine === "string" ? journey.pickupAddressLine : "";
  const dropoffAddressLine =
    typeof journey.dropoffAddressLine === "string" ? journey.dropoffAddressLine : "";
  const pickupPostcode = extractPostcodeFromAddress(pickupAddressLine);
  const dropoffPostcode = extractPostcodeFromAddress(dropoffAddressLine);

  const scheduledRaw = journey.scheduledPickupAt;
  const scheduledPickupAt =
    typeof scheduledRaw === "string" ? new Date(scheduledRaw) : null;
  if (!scheduledPickupAt || Number.isNaN(scheduledPickupAt.getTime())) {
    throw new HttpsError(
      "invalid-argument",
      "trip.journey.scheduledPickupAt must be a valid ISO string."
    );
  }

  const bookedHours =
    tripType === "hourly"
      ? Number(journey.bookedHours)
      : journey.bookedHours != null
        ? Number(journey.bookedHours)
        : null;
  if (tripType === "hourly" && (!Number.isFinite(bookedHours) || bookedHours <= 0)) {
    throw new HttpsError("invalid-argument", "trip.journey.bookedHours is required for hourly.");
  }

  const addonIds = extractAddonIds(journey);

  let branchId =
    typeof branchIdHint === "string" && branchIdHint.trim()
      ? branchIdHint.trim()
      : null;
  if (!branchId) {
    try {
      branchId = await resolveBookingBranchId(db, {
        journey: { pickupAddressLine, pickup },
      });
    } catch (err) {
      if (err && err.code === "out_of_area") {
        throw new HttpsError("failed-precondition", err.message || "Outside service area.");
      }
      throw err;
    }
  }

  const mapboxToken = getMapboxToken();
  if (!mapboxToken) {
    throw new HttpsError(
      "failed-precondition",
      "Mapbox access token is not configured."
    );
  }

  const [
    pricingSnap,
    localeSnap,
    vehicleClassSnap,
    locationsSnap,
    customerSnap,
    { license, catalog },
  ] = await Promise.all([
    db.doc(`${Collections.branches}/${branchId}/settings/pricing`).get(),
    db.doc(`${Collections.branches}/${branchId}/settings/locale`).get(),
    db.doc(`${Collections.branches}/${branchId}/vehicle_classes/${vehicleClassId}`).get(),
    db.collection(`${Collections.branches}/${branchId}/locations`).get(),
    db.doc(`${Collections.users}/${customerId}`).get(),
    loadLicenseAndPlans(db),
  ]);

  if (!pricingSnap.exists) {
    throw new HttpsError("failed-precondition", "Pricing is not configured for this Location.");
  }
  if (!localeSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Locale is not configured for this Location."
    );
  }
  if (!vehicleClassSnap.exists) {
    throw new HttpsError("not-found", "Vehicle class not found.");
  }
  if (!customerSnap.exists) {
    throw new HttpsError("not-found", "Customer not found.");
  }

  const pricing = mapPricingConfig(pricingSnap.data());
  const locale = mapOperatorLocale(localeSnap.data());
  const vehicleClass = mapVehicleClass(vehicleClassSnap.id, vehicleClassSnap.data());

  const locations = locationsSnap.docs.map((doc) => {
    const d = doc.data() || {};
    return {
      id: doc.id,
      name: d.name || "",
      addressLine: d.addressLine || "",
      latitude: typeof d.latitude === "number" ? d.latitude : 0,
      longitude: typeof d.longitude === "number" ? d.longitude : 0,
      isDefault: d.isDefault === true,
    };
  });
  const officeLocation = findDefaultOffice(locations);
  const officeCoord = {
    latitude: officeLocation.latitude,
    longitude: officeLocation.longitude,
  };

  const corporateAccountsEnabled = isFeatureEnabled(license, catalog, "corporateAccounts");
  if (!corporateAccountsEnabled && settlement === "on_account") {
    throw new HttpsError(
      "failed-precondition",
      "Corporate accounts are not enabled on this plan."
    );
  }

  let corporateAccount = null;
  const customerData = customerSnap.data() || {};
  const corporateAccountId =
    typeof customerData.corporateAccountId === "string"
      ? customerData.corporateAccountId.trim()
      : "";

  if (
    corporateAccountsEnabled &&
    corporateAccountId &&
    (settlement === "on_account" || settlement === "card")
  ) {
    const accountSnap = await db
      .doc(`${Collections.corporateAccounts}/${corporateAccountId}`)
      .get();
    if (!accountSnap.exists) {
      throw new HttpsError("failed-precondition", "Corporate account not found.");
    }
    const account = mapCorporateAccount(accountSnap.id, accountSnap.data());
    if (account.status !== "active") {
      throw new HttpsError("failed-precondition", "Corporate account is not active.");
    }
    if (!account.allowedPaymentMethods.includes(settlement)) {
      throw new HttpsError(
        "failed-precondition",
        `Corporate account does not allow ${settlement} settlement.`
      );
    }
    if (
      Array.isArray(account.allowedVehicleClassIds) &&
      account.allowedVehicleClassIds.length > 0 &&
      !account.allowedVehicleClassIds.includes(vehicleClassId)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Vehicle class is not allowed for this corporate account."
      );
    }
    corporateAccount = account;
  } else if (settlement === "on_account") {
    throw new HttpsError(
      "failed-precondition",
      "Customer is not linked to a corporate account."
    );
  }

  // Feature off → retail quote (no corporate). Card settlement without account → retail.
  if (!corporateAccountsEnabled) {
    corporateAccount = null;
  }

  let appliedPromo = null;
  if (promoCode && !corporateAccount) {
    appliedPromo = await loadAppliedPromo(db, promoCode);
  }

  const [onboard, officeToPickup, dropoffToOffice] = await Promise.all([
    requireRouteMetrics(pickup, dropoff, mapboxToken),
    requireRouteMetrics(officeCoord, pickup, mapboxToken),
    requireRouteMetrics(dropoff, officeCoord, mapboxToken),
  ]);

  const quoteRequest = {
    tripType,
    vehicleClassId,
    pickup,
    dropoff,
    pickupAddressLine,
    dropoffAddressLine,
    pickupPostcode,
    dropoffPostcode,
    scheduledPickupAt,
    bookedHours: tripType === "hourly" ? bookedHours : null,
    addonIds,
    appliedPromo,
    corporateAccount,
  };

  let result;
  try {
    result = computeQuote(quoteRequest, {
      pricing,
      locale,
      vehicleClass,
      officeLocation,
      routeDistanceMeters: onboard.distanceMeters,
      deadheadDistanceMeters:
        officeToPickup.distanceMeters + dropoffToOffice.distanceMeters,
      deadheadDurationMinutes:
        (officeToPickup.durationSeconds + dropoffToOffice.durationSeconds) / 60,
    });
  } catch (err) {
    if (err instanceof QuoteError) {
      throw new HttpsError("failed-precondition", err.message);
    }
    throw err;
  }

  return {
    branchId,
    settlement,
    ...serializeQuoteResult(result),
  };
}

/**
 * Callable handler: compute a trip quote.
 * data: {
 *   branchId?, customerId, settlement: 'on_account'|'card',
 *   trip: { journey: { tripType, pickup, dropoff, ... }, quote: { vehicleClassId } },
 *   promoCode?
 * }
 */
async function computeQuoteHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();

  const data = request.data || {};
  const customerId = typeof data.customerId === "string" ? data.customerId.trim() : "";
  if (!customerId) {
    throw new HttpsError("invalid-argument", "customerId is required.");
  }

  const settlement = data.settlement;
  if (!ALLOWED_SETTLEMENTS.has(settlement)) {
    throw new HttpsError(
      "invalid-argument",
      "settlement must be 'on_account' or 'card'."
    );
  }

  const trip = data.trip;
  if (!trip || typeof trip !== "object") {
    throw new HttpsError("invalid-argument", "trip is required.");
  }

  const callerSnap = await db.doc(`${Collections.users}/${uid}`).get();
  const callerRole = callerSnap.exists ? callerSnap.get("role") : null;
  const isAdmin = callerRole === "admin";
  if (!isAdmin && customerId !== uid) {
    throw new HttpsError("permission-denied", "Customers may only quote themselves.");
  }

  return runComputeQuote(db, {
    customerId,
    settlement,
    trip,
    branchIdHint:
      typeof data.branchId === "string" && data.branchId.trim()
        ? data.branchId.trim()
        : null,
    promoCode: data.promoCode || null,
  });
}


module.exports = {
  computeQuoteHandler,
  runComputeQuote,
};
