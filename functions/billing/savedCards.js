const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { requireAuth, requireCustomer } = require("../lib/auth");
const {
  detachSavedCard,
  syncSavedCardsFromStripe,
  setDefaultSavedCard,
} = require("../stripe/saved-cards");

async function removeSavedCardHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const paymentMethodId = request.data?.paymentMethodId;
  if (typeof paymentMethodId !== "string" || !paymentMethodId) {
    throw new HttpsError("invalid-argument", "paymentMethodId is required.");
  }

  await detachSavedCard(db, uid, paymentMethodId);
  return { ok: true };
}

async function syncSavedCardsHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const { synced } = await syncSavedCardsFromStripe(db, uid);
  return { ok: true, synced };
}

async function setDefaultSavedCardHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const paymentMethodId = request.data?.paymentMethodId;
  if (typeof paymentMethodId !== "string" || !paymentMethodId) {
    throw new HttpsError("invalid-argument", "paymentMethodId is required.");
  }

  await setDefaultSavedCard(db, uid, paymentMethodId);
  return { ok: true };
}

module.exports = {
  removeSavedCardHandler,
  setDefaultSavedCardHandler,
  syncSavedCardsHandler,
};
