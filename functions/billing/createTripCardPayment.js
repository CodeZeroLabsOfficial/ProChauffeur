const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { tripRef } = require("../lib/collections");
const { resolveBookingBranchId } = require("../lib/resolve-branch");
const { requireAuth, requireCustomer } = require("../lib/auth");
const { syncUserStripeCustomer } = require("../stripe/customer");
const {
  paymentIntentAmountMatches,
  retrieveReusablePaymentIntent,
  cancelPaymentIntent,
  createTripCardPaymentIntent,
  toStripeAmount,
} = require("../stripe/payments");
const { runComputeQuote } = require("./computeQuote");

function validateTripPayload(trip, customerUid) {
  if (!trip || typeof trip !== "object") {
    throw new HttpsError("invalid-argument", "Invalid trip payload.");
  }
  if (typeof trip.id !== "string" || !trip.id) {
    throw new HttpsError("invalid-argument", "Trip id is required.");
  }
  if (trip.customerID !== customerUid) {
    throw new HttpsError("permission-denied", "Trip customer does not match signed-in user.");
  }
  if (!trip.pickup || !trip.dropoff) {
    throw new HttpsError("invalid-argument", "Trip pickup and dropoff are required.");
  }
  if (typeof trip.vehicleClassId !== "string" || !trip.vehicleClassId.trim()) {
    throw new HttpsError("invalid-argument", "Trip vehicleClassId is required.");
  }
  if (trip.paymentStatus === "on_account") {
    throw new HttpsError(
      "failed-precondition",
      "On-account bookings cannot be charged via card payment."
    );
  }
}

function sumTripTotals(trips) {
  let total = 0;
  let currency = "AUD";
  for (const trip of trips) {
    total += Number(trip.quotedTotal) || 0;
    if (trip.quotedCurrencyCode) currency = trip.quotedCurrencyCode;
  }
  return { total, currency };
}

function scheduledPickupIso(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new admin.firestore.Timestamp(value.seconds, value.nanoseconds || 0)
      .toDate()
      .toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return null;
}

function extractAddonIds(trip) {
  if (Array.isArray(trip.addonIds)) {
    return trip.addonIds.filter((id) => typeof id === "string" && id);
  }
  if (Array.isArray(trip.bookingAddons)) {
    return trip.bookingAddons
      .map((a) => (a && typeof a.id === "string" ? a.id : null))
      .filter(Boolean);
  }
  return [];
}

function extractPostcode(line) {
  if (typeof line !== "string") return "";
  const match = line.match(/\b\d{4}\b/);
  return match ? match[0] : "";
}

/**
 * Recomputes each leg on the server and overwrites client quote fields.
 */
async function applyServerQuotes(db, uid, trips, branchId) {
  const quoted = [];
  for (const trip of trips) {
    const scheduledPickupAt = scheduledPickupIso(trip.scheduledPickupAt);
    if (!scheduledPickupAt) {
      throw new HttpsError(
        "invalid-argument",
        "trip.scheduledPickupAt must be a valid date."
      );
    }
    const pickupAddressLine =
      typeof trip.pickupAddressLine === "string" ? trip.pickupAddressLine : "";
    const dropoffAddressLine =
      typeof trip.dropoffAddressLine === "string" ? trip.dropoffAddressLine : "";

    const quote = await runComputeQuote(db, {
      customerId: uid,
      settlement: "card",
      branchIdHint: branchId,
      trip: {
        tripType: trip.tripType || "transfer",
        vehicleClassId: trip.vehicleClassId,
        pickup: trip.pickup,
        dropoff: trip.dropoff,
        pickupAddressLine,
        dropoffAddressLine,
        pickupPostcode:
          typeof trip.pickupPostcode === "string" && trip.pickupPostcode
            ? trip.pickupPostcode
            : extractPostcode(pickupAddressLine),
        dropoffPostcode:
          typeof trip.dropoffPostcode === "string" && trip.dropoffPostcode
            ? trip.dropoffPostcode
            : extractPostcode(dropoffAddressLine),
        scheduledPickupAt,
        addonIds: extractAddonIds(trip),
      },
    });

    const total = Number(quote.total);
    if (!Number.isFinite(total) || total <= 0) {
      throw new HttpsError(
        "failed-precondition",
        "Could not compute a valid fare for this booking."
      );
    }

    quoted.push({
      ...trip,
      quotedSubtotal: quote.subtotal,
      quotedTaxAmount: quote.taxAmount,
      quotedTotal: quote.total,
      quotedCurrencyCode: quote.currencyCode,
      quotedTaxRate: quote.quotedTaxRate,
      quotedPricesIncludeTax: quote.quotedPricesIncludeTax,
      quoteBreakdown: quote.breakdown,
      quoteSnapshot: quote.snapshot,
      quoteComputedAt: new Date().toISOString(),
    });
  }
  return quoted;
}

const TRIP_DATE_FIELDS = [
  "quoteComputedAt",
  "scheduledPickupAt",
  "createdAt",
  "updatedAt",
  "journeyStartedAt",
  "journeyCompletedAt",
  "paidAt",
];

function parseFirestoreDate(value) {
  if (value == null) return null;
  if (value instanceof admin.firestore.Timestamp) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return admin.firestore.Timestamp.fromDate(parsed);
    }
    return null;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new admin.firestore.Timestamp(value.seconds, value.nanoseconds || 0);
  }
  return value;
}

function normalizeTripForFirestore(trip) {
  const out = { ...trip };
  for (const field of TRIP_DATE_FIELDS) {
    if (out[field] != null) {
      out[field] = parseFirestoreDate(out[field]);
    }
  }
  if (out.driverID == null || out.driverID === "") {
    out.driverID = null;
  }
  return out;
}

/**
 * Upserts booking trip docs as pending card payment.
 * @param {string|null} stripePaymentIntentId Existing PI to preserve, or null before creating one.
 */
async function upsertPendingTrips(db, tripsInput, branchId, stripePaymentIntentId) {
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const trip of tripsInput) {
    const normalizedTrip = normalizeTripForFirestore(trip);
    const ref = tripRef(db, trip.id, branchId);
    batch.set(ref, {
      ...normalizedTrip,
      branchId,
      status: normalizedTrip.status || "requested",
      paymentStatus: "pending",
      paymentSource: "ios",
      stripePaymentIntentId: stripePaymentIntentId || null,
      invoiceId: null,
      paidAt: null,
      createdAt: normalizedTrip.createdAt || now,
      updatedAt: now,
    });
  }
  await batch.commit();
}

/**
 * When the client retries with the same trip ids, reuse an open PaymentIntent
 * instead of creating a second charge for the same booking attempt.
 */
async function findReusablePaymentIntent(db, primaryTripId, branchId) {
  const snap = await tripRef(db, primaryTripId, branchId).get();
  if (!snap.exists) return null;

  const data = snap.data() || {};
  if (data.paymentStatus !== "pending") return null;

  const existingIntentId =
    typeof data.stripePaymentIntentId === "string" ? data.stripePaymentIntentId : null;
  if (!existingIntentId) return null;

  return retrieveReusablePaymentIntent(existingIntentId);
}

async function createTripCardPaymentHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const tripsInput = request.data?.trips;
  if (!Array.isArray(tripsInput) || tripsInput.length === 0) {
    throw new HttpsError("invalid-argument", "trips array is required.");
  }

  const paymentMethodId =
    typeof request.data?.paymentMethodId === "string" ? request.data.paymentMethodId : null;
  const saveCard = Boolean(request.data?.saveCard);

  for (const trip of tripsInput) {
    validateTripPayload(trip, uid);
  }

  let branchId;
  try {
    branchId = await resolveBookingBranchId(db, tripsInput[0]);
  } catch (err) {
    if (err && err.code === "out_of_area") {
      throw new HttpsError("failed-precondition", err.message || "Outside service area.");
    }
    throw err;
  }

  const quotedTrips = await applyServerQuotes(db, uid, tripsInput, branchId);
  const { total, currency } = sumTripTotals(quotedTrips);
  if (!Number.isFinite(total) || total <= 0) {
    throw new HttpsError(
      "failed-precondition",
      "Could not compute a valid fare for this booking."
    );
  }

  const stripeCustomerId = await syncUserStripeCustomer(db, uid);
  const amountCents = toStripeAmount(total, currency);
  const primaryTripId = quotedTrips[0].id;
  const tripIds = quotedTrips.map((t) => t.id);

  const reusableIntent = await findReusablePaymentIntent(db, primaryTripId, branchId);

  if (
    reusableIntent &&
    paymentIntentAmountMatches(reusableIntent, amountCents, currency)
  ) {
    await upsertPendingTrips(db, quotedTrips, branchId, reusableIntent.id);
    return {
      clientSecret: reusableIntent.client_secret,
      paymentIntentId: reusableIntent.id,
      tripId: primaryTripId,
      tripIds,
      branchId,
      stripeCustomerId,
    };
  }

  if (reusableIntent) {
    await cancelPaymentIntent(reusableIntent.id);
  }

  await upsertPendingTrips(db, quotedTrips, branchId, null);

  const paymentIntent = await createTripCardPaymentIntent({
    amount: total,
    currency,
    stripeCustomerId,
    firebaseUid: uid,
    primaryTripId,
    tripIds,
    branchId,
    paymentMethodId,
    saveCard,
  });

  for (const tripId of tripIds) {
    await tripRef(db, tripId, branchId).update({
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    tripId: primaryTripId,
    tripIds,
    branchId,
    stripeCustomerId,
  };
}

module.exports = { createTripCardPaymentHandler };
