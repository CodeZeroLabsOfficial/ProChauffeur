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
  const journey = trip.journey && typeof trip.journey === "object" ? trip.journey : {};
  const quote = trip.quote && typeof trip.quote === "object" ? trip.quote : {};
  const billing = trip.billing && typeof trip.billing === "object" ? trip.billing : {};
  if (!journey.pickup || !journey.dropoff) {
    throw new HttpsError("invalid-argument", "Trip journey.pickup and journey.dropoff are required.");
  }
  if (typeof quote.vehicleClassId !== "string" || !quote.vehicleClassId.trim()) {
    throw new HttpsError("invalid-argument", "Trip quote.vehicleClassId is required.");
  }
  if (billing.paymentStatus === "on_account") {
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
    total += Number(trip.quote?.quotedTotal) || 0;
    if (trip.quote?.quotedCurrencyCode) currency = trip.quote.quotedCurrencyCode;
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

/**
 * Recomputes each leg on the server and overwrites client quote fields.
 */
async function applyServerQuotes(db, uid, trips, branchId) {
  const quoted = [];
  for (const trip of trips) {
    const journey = trip.journey && typeof trip.journey === "object" ? trip.journey : {};
    const quote = trip.quote && typeof trip.quote === "object" ? trip.quote : {};

    const scheduledPickupAt = scheduledPickupIso(journey.scheduledPickupAt);
    if (!scheduledPickupAt) {
      throw new HttpsError(
        "invalid-argument",
        "trip.journey.scheduledPickupAt must be a valid date."
      );
    }
    const pickupAddressLine =
      typeof journey.pickupAddressLine === "string" ? journey.pickupAddressLine : "";
    const dropoffAddressLine =
      typeof journey.dropoffAddressLine === "string" ? journey.dropoffAddressLine : "";

    const quoteResult = await runComputeQuote(db, {
      customerId: uid,
      settlement: "card",
      branchIdHint: branchId,
      trip: {
        journey: {
          tripType: journey.tripType || "transfer",
          pickup: journey.pickup,
          dropoff: journey.dropoff,
          pickupAddressLine,
          dropoffAddressLine,
          scheduledPickupAt,
          bookedHours: journey.bookedHours,
          bookingAddons: journey.bookingAddons,
        },
        quote: {
          vehicleClassId: quote.vehicleClassId,
        },
      },
    });

    const total = Number(quoteResult.total);
    if (!Number.isFinite(total) || total <= 0) {
      throw new HttpsError(
        "failed-precondition",
        "Could not compute a valid fare for this booking."
      );
    }

    quoted.push({
      ...trip,
      quote: {
        ...quote,
        quotedSubtotal: quoteResult.subtotal,
        quotedTaxAmount: quoteResult.taxAmount,
        quotedTotal: quoteResult.total,
        quotedCurrencyCode: quoteResult.currencyCode,
        quotedTaxRate: quoteResult.quotedTaxRate,
        quotedPricesIncludeTax: quoteResult.quotedPricesIncludeTax,
        quoteBreakdown: quoteResult.breakdown,
        quoteSnapshot: quoteResult.snapshot,
        quoteComputedAt: new Date().toISOString(),
      },
    });
  }
  return quoted;
}

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

/** Converts nested trip date fields to Firestore Timestamps before a `set`. */
function normalizeTripForFirestore(trip) {
  const journey = { ...(trip.journey || {}) };
  const quote = { ...(trip.quote || {}) };
  const billing = { ...(trip.billing || {}) };

  if (journey.scheduledPickupAt != null) {
    journey.scheduledPickupAt = parseFirestoreDate(journey.scheduledPickupAt);
  }
  if (journey.journeyStartedAt != null) {
    journey.journeyStartedAt = parseFirestoreDate(journey.journeyStartedAt);
  }
  if (journey.journeyCompletedAt != null) {
    journey.journeyCompletedAt = parseFirestoreDate(journey.journeyCompletedAt);
  }
  if (quote.quoteComputedAt != null) {
    quote.quoteComputedAt = parseFirestoreDate(quote.quoteComputedAt);
  }
  if (quote.quoteSnapshot && typeof quote.quoteSnapshot === "object") {
    const snap = { ...quote.quoteSnapshot };
    if (snap.scheduledPickupAt != null) {
      snap.scheduledPickupAt = parseFirestoreDate(snap.scheduledPickupAt);
    }
    quote.quoteSnapshot = snap;
  }
  if (billing.paidAt != null) {
    billing.paidAt = parseFirestoreDate(billing.paidAt);
  }

  return {
    ...trip,
    journey,
    quote,
    billing,
    createdAt: trip.createdAt != null ? parseFirestoreDate(trip.createdAt) : trip.createdAt,
    updatedAt: trip.updatedAt != null ? parseFirestoreDate(trip.updatedAt) : trip.updatedAt,
    driverID: trip.driverID == null || trip.driverID === "" ? null : trip.driverID,
  };
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
      billing: {
        ...normalizedTrip.billing,
        paymentStatus: "pending",
        paymentSource: "ios",
        stripePaymentIntentId: stripePaymentIntentId || null,
        invoiceId: null,
        paidAt: null,
      },
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
  const billing = data.billing && typeof data.billing === "object" ? data.billing : {};
  if (billing.paymentStatus !== "pending") return null;

  const existingIntentId =
    typeof billing.stripePaymentIntentId === "string" ? billing.stripePaymentIntentId : null;
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
      "billing.stripePaymentIntentId": paymentIntent.id,
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
