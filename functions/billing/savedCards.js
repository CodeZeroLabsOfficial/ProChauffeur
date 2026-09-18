const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { requireAuth, requireCustomer } = require("../lib/auth");
const { syncUserStripeCustomer } = require("../stripe/customer");
const { createSavedCardSetupIntent } = require("../stripe/payments");
const {
  detachSavedCard,
  syncSavedCardsFromStripe,
  setDefaultSavedCard,
} = require("../stripe/saved-cards");

function requirePaymentMethodId(data) {
  const paymentMethodId = data?.paymentMethodId;
  if (typeof paymentMethodId !== "string" || !paymentMethodId) {
    throw new HttpsError("invalid-argument", "paymentMethodId is required.");
  }
  return paymentMethodId;
}

/**
 * Customer saved-card vault: prepare SetupIntent, sync, remove, or set default.
 * request.data: { action: "prepare"|"sync"|"remove"|"setDefault", paymentMethodId? }
 */
async function manageSavedCardsHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const action = request.data?.action;
  switch (action) {
    case "prepare": {
      const stripeCustomerId = await syncUserStripeCustomer(db, uid);
      return createSavedCardSetupIntent(stripeCustomerId, uid);
    }
    case "sync": {
      const { synced } = await syncSavedCardsFromStripe(db, uid);
      return { ok: true, synced };
    }
    case "remove": {
      await detachSavedCard(db, uid, requirePaymentMethodId(request.data));
      return { ok: true };
    }
    case "setDefault": {
      await setDefaultSavedCard(db, uid, requirePaymentMethodId(request.data));
      return { ok: true };
    }
    default:
      throw new HttpsError("invalid-argument", "action is required.");
  }
}

module.exports = { manageSavedCardsHandler };
