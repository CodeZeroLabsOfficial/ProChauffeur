const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { tripRef } = require("../lib/collections");
const { resolveBookingBranchId } = require("../lib/resolve-branch");
const { requireAuth, requireCustomer } = require("../lib/auth");
const { getStripe, toStripeAmount } = require("../stripe/client");
const { syncUserStripeCustomer } = require("../stripe/customer");

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
  const total = Number(trip.quotedTotal);
  if (!Number.isFinite(total) || total <= 0) {
    throw new HttpsError("invalid-argument", "A valid quoted total is required.");
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

async function createBookingPaymentHandler(request) {
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
    if (trip.paymentStatus === "on_account") {
      throw new HttpsError(
        "failed-precondition",
        "On-account bookings cannot be charged via card payment."
      );
    }
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

  const { total, currency } = sumTripTotals(tripsInput);
  const stripeCustomerId = await syncUserStripeCustomer(db, uid);
  const stripe = getStripe();
  const amountCents = toStripeAmount(total, currency);
  const primaryTripId = tripsInput[0].id;
  const tripIds = tripsInput.map((t) => t.id);

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
      stripePaymentIntentId: null,
      invoiceId: null,
      paidAt: null,
      createdAt: normalizedTrip.createdAt || now,
      updatedAt: now,
    });
  }
  await batch.commit();

  const intentParams = {
    amount: amountCents,
    currency: String(currency).toLowerCase(),
    customer: stripeCustomerId,
    metadata: {
      firebaseUid: uid,
      tripId: primaryTripId,
      tripIds: JSON.stringify(tripIds),
      branchId,
      source: "ios",
    },
  };

  if (paymentMethodId) {
    intentParams.payment_method = paymentMethodId;
    intentParams.confirm = false;
    intentParams.off_session = false;
  } else if (saveCard) {
    intentParams.setup_future_usage = "off_session";
    intentParams.automatic_payment_methods = { enabled: true };
  } else {
    intentParams.automatic_payment_methods = { enabled: true };
  }

  const paymentIntent = await stripe.paymentIntents.create(intentParams);

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

module.exports = { createBookingPaymentHandler };
