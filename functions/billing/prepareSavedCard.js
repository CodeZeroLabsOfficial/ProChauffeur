const admin = require("firebase-admin");
const { requireAuth, requireCustomer } = require("../lib/auth");
const { syncUserStripeCustomer } = require("../stripe/customer");
const { createSavedCardSetupIntent } = require("../stripe/payments");

async function prepareSavedCardHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const stripeCustomerId = await syncUserStripeCustomer(db, uid);
  return createSavedCardSetupIntent(stripeCustomerId, uid);
}

module.exports = { prepareSavedCardHandler };
