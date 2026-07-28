const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { requireAuth, requireCustomer } = require("../lib/auth");
const { getStripe } = require("../stripe/client");
const { syncUserStripeCustomer } = require("../stripe/customer");

async function createSetupIntentHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const stripeCustomerId = await syncUserStripeCustomer(db, uid);
  const stripe = getStripe();

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    usage: "off_session",
    metadata: { firebaseUid: uid, source: "ios" },
    automatic_payment_methods: { enabled: true },
  });

  return {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
    stripeCustomerId,
  };
}

module.exports = { createSetupIntentHandler };
