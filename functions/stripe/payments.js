const { HttpsError } = require("firebase-functions/v2/https");
const { requireBranchId } = require("../lib/collections");
const { getStripe, toStripeAmount } = require("./client");

const REUSABLE_PI_STATUSES = new Set([
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
]);

function paymentIntentAmountMatches(paymentIntent, amountCents, currency) {
  if (!paymentIntent) return false;
  const piCurrency = String(paymentIntent.currency || "").toLowerCase();
  const wantCurrency = String(currency || "").toLowerCase();
  if (piCurrency !== wantCurrency) return false;
  return Math.abs(Number(paymentIntent.amount) - amountCents) <= 1;
}

/**
 * Retrieve an open PaymentIntent by id, or null if missing / not reusable.
 * Throws if the intent already succeeded.
 */
async function retrieveReusablePaymentIntent(existingIntentId) {
  if (!existingIntentId) return null;

  const stripe = getStripe();
  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.retrieve(existingIntentId);
  } catch {
    return null;
  }

  if (paymentIntent.status === "succeeded") {
    throw new HttpsError("failed-precondition", "This booking is already paid.");
  }

  if (REUSABLE_PI_STATUSES.has(paymentIntent.status) && paymentIntent.client_secret) {
    return paymentIntent;
  }

  return null;
}

async function cancelPaymentIntent(paymentIntentId) {
  const stripe = getStripe();
  try {
    await stripe.paymentIntents.cancel(paymentIntentId);
  } catch {
    // Caller falls through to create a new intent.
  }
}

/** Create a PaymentIntent for trip card checkout. */
async function createTripCardPaymentIntent({
  amount,
  currency,
  stripeCustomerId,
  firebaseUid,
  primaryTripId,
  tripIds,
  branchId,
  paymentMethodId,
  saveCard,
}) {
  const resolvedBranchId = requireBranchId(branchId);
  const stripe = getStripe();
  const amountCents = toStripeAmount(amount, currency);

  const intentParams = {
    amount: amountCents,
    currency: String(currency).toLowerCase(),
    customer: stripeCustomerId,
    metadata: {
      firebaseUid,
      tripId: primaryTripId,
      tripIds: JSON.stringify(tripIds),
      branchId: resolvedBranchId,
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

  return stripe.paymentIntents.create(intentParams);
}

/**
 * Create a SetupIntent so the client can save a card for later.
 */
async function createSavedCardSetupIntent(stripeCustomerId, firebaseUid) {
  const stripe = getStripe();
  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    usage: "off_session",
    metadata: { firebaseUid, source: "ios" },
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
    stripeCustomerId,
  };
}

module.exports = {
  paymentIntentAmountMatches,
  retrieveReusablePaymentIntent,
  cancelPaymentIntent,
  createTripCardPaymentIntent,
  createSavedCardSetupIntent,
  toStripeAmount,
};
