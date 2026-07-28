const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { PaymentMethodSubcollection } = require("../lib/collections");
const { requireAuth, requireCustomer } = require("../lib/auth");
const { getStripe } = require("../stripe/client");
const { syncUserStripeCustomer } = require("../stripe/customer");

function cardDisplayLabel(brand, last4) {
  const b = String(brand || "card").toUpperCase();
  return `${b} •••• ${last4}`;
}

async function syncPaymentMethodToFirestore(db, uid, pm, isDefault) {
  const card = pm.card;
  if (!card) return;

  const ref = db
    .collection("users")
    .doc(uid)
    .collection(PaymentMethodSubcollection)
    .doc(pm.id);

  await ref.set({
    id: pm.id,
    stripePaymentMethodId: pm.id,
    type: pm.type || "card",
    brand: card.brand || "card",
    last4: card.last4 || "",
    expMonth: card.exp_month || 0,
    expYear: card.exp_year || 0,
    isDefault: Boolean(isDefault),
    displayLabel: cardDisplayLabel(card.brand, card.last4),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function detachPaymentMethodHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const paymentMethodId = request.data?.paymentMethodId;
  if (typeof paymentMethodId !== "string" || !paymentMethodId) {
    throw new HttpsError("invalid-argument", "paymentMethodId is required.");
  }

  const stripe = getStripe();
  await stripe.paymentMethods.detach(paymentMethodId);

  await db
    .collection("users")
    .doc(uid)
    .collection(PaymentMethodSubcollection)
    .doc(paymentMethodId)
    .delete();

  return { ok: true };
}

async function syncPaymentMethodsHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const stripeCustomerId = await syncUserStripeCustomer(db, uid);
  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  const defaultPmId = customer.invoice_settings?.default_payment_method;

  const list = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: "card",
  });

  const activeIds = new Set();
  for (const pm of list.data) {
    activeIds.add(pm.id);
    await syncPaymentMethodToFirestore(db, uid, pm, pm.id === defaultPmId);
  }

  const col = db.collection("users").doc(uid).collection(PaymentMethodSubcollection);
  const snap = await col.get();
  const batch = db.batch();
  let batchOps = 0;
  for (const doc of snap.docs) {
    if (!activeIds.has(doc.id)) {
      batch.delete(doc.ref);
      batchOps += 1;
    }
  }
  if (batchOps > 0) {
    await batch.commit();
  }

  return { ok: true, synced: list.data.length };
}

async function setDefaultPaymentMethodHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireCustomer(db, uid);

  const paymentMethodId = request.data?.paymentMethodId;
  if (typeof paymentMethodId !== "string" || !paymentMethodId) {
    throw new HttpsError("invalid-argument", "paymentMethodId is required.");
  }

  const stripeCustomerId = await syncUserStripeCustomer(db, uid);
  const stripe = getStripe();

  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const col = db.collection("users").doc(uid).collection(PaymentMethodSubcollection);
  const snap = await col.get();
  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      isDefault: doc.id === paymentMethodId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  return { ok: true };
}

module.exports = {
  detachPaymentMethodHandler,
  setDefaultPaymentMethodHandler,
  syncPaymentMethodsHandler,
  syncPaymentMethodToFirestore,
};
