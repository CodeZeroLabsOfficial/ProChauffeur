const admin = require("firebase-admin");
const {
  Collections,
  PaymentMethodSubcollection,
  DEFAULT_BRANCH_ID,
  resolveTripRef,
  resolveInvoiceRef,
} = require("../lib/collections");
const {
  createFirestoreInvoice,
  loadTripsForPaymentInvoice,
} = require("../billing/invoiceFromTrip");
const { syncPaymentMethodToFirestore } = require("./saved-cards");
const { getStripe, stripeWebhookSecret } = require("./client");

async function recordPaymentEvent(db, event) {
  const ref = db.collection(Collections.paymentEvents).doc(event.id);
  const existing = await ref.get();
  if (existing.exists) return false;
  await ref.set({
    stripeEventId: event.id,
    type: event.type,
    stripeObjectId: event.data.object?.id || null,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
    rawMetadata: event.data.object?.metadata || {},
  });
  return true;
}

async function findUidForStripeCustomer(db, customerId) {
  const snap = await db
    .collection(Collections.users)
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/** Parses the trip id list from Stripe payment-intent metadata. */
function parseTripIdsFromMetadata(metadata) {
  try {
    if (metadata.tripIds) return JSON.parse(metadata.tripIds);
  } catch {
    return metadata.tripId ? [metadata.tripId] : [];
  }
  return [];
}

function branchIdFromMetadata(metadata) {
  if (typeof metadata.branchId === "string" && metadata.branchId.trim()) {
    return metadata.branchId.trim();
  }
  return DEFAULT_BRANCH_ID;
}

async function handlePaymentIntentSucceeded(db, paymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const uid = metadata.firebaseUid;
  const branchId = branchIdFromMetadata(metadata);

  const seedIds = parseTripIdsFromMetadata(metadata);
  if (metadata.tripId && !seedIds.includes(metadata.tripId)) {
    seedIds.unshift(metadata.tripId);
  }

  if (seedIds.length === 0 || !uid) return;

  const { trips, refs, tripIds } = await loadTripsForPaymentInvoice(
    db,
    seedIds,
    branchId
  );
  if (trips.length === 0) return;

  const now = admin.firestore.FieldValue.serverTimestamp();
  const paymentSource = metadata.source === "web" ? "web" : "ios";

  const paidBatch = db.batch();
  for (const ref of refs) {
    paidBatch.update(ref, {
      "billing.paymentStatus": "paid",
      "billing.paymentSource": paymentSource,
      "billing.stripePaymentIntentId": paymentIntent.id,
      "billing.paidAt": now,
      updatedAt: now,
    });
  }
  await paidBatch.commit();

  const primary = trips[0];
  const primaryInvoiceId = primary.billing?.invoiceId;
  if (primaryInvoiceId) {
    const { ref: invoiceDoc } = await resolveInvoiceRef(
      db,
      primaryInvoiceId,
      branchId
    );
    await invoiceDoc.update({
      status: "paid",
      paidAt: now,
      stripePaymentIntentId: paymentIntent.id,
      updatedAt: now,
    });
    return;
  }

  console.info("Creating invoice for payment intent", {
    paymentIntentId: paymentIntent.id,
    tripIds,
    tripCount: trips.length,
    quotedTotals: trips.map((t) => Number(t.quote?.quotedTotal) || 0),
  });

  const invoice = await createFirestoreInvoice(db, {
    trips,
    status: "paid",
    source: "ios",
    branchId,
    stripeFields: { stripePaymentIntentId: paymentIntent.id },
  });

  const invoiceLinkBatch = db.batch();
  for (const ref of refs) {
    invoiceLinkBatch.update(ref, {
      "billing.invoiceId": invoice.id,
      updatedAt: now,
    });
  }
  await invoiceLinkBatch.commit();
}

async function handlePaymentIntentFailed(db, paymentIntent) {
  const metadata = paymentIntent.metadata || {};
  const branchId = branchIdFromMetadata(metadata);
  const tripIds = parseTripIdsFromMetadata(metadata);
  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const tripId of tripIds) {
    const { ref } = await resolveTripRef(db, tripId, branchId);
    batch.update(ref, {
      "billing.paymentStatus": "failed",
      updatedAt: now,
    });
  }
  await batch.commit();
}

async function handleInvoicePaid(db, stripeInvoice) {
  const metadata = stripeInvoice.metadata || {};
  const invoiceId = metadata.invoiceId;
  const tripId = metadata.tripId;
  const branchId = branchIdFromMetadata(metadata);
  const now = admin.firestore.FieldValue.serverTimestamp();

  /** @type {string[]} */
  let tripIds = [];
  try {
    if (metadata.tripIds) {
      const parsed = JSON.parse(metadata.tripIds);
      if (Array.isArray(parsed)) {
        tripIds = parsed.filter((id) => typeof id === "string" && id.trim());
      }
    }
  } catch {
    // ignore malformed tripIds metadata
  }
  if (tripId && !tripIds.includes(tripId)) {
    tripIds.unshift(tripId);
  }

  if (invoiceId) {
    const { ref, snap } = await resolveInvoiceRef(db, invoiceId, branchId);
    await ref.update({
      status: "paid",
      paidAt: now,
      stripeInvoiceId: stripeInvoice.id,
      stripeHostedInvoiceUrl: stripeInvoice.hosted_invoice_url || null,
      updatedAt: now,
    });

    if (tripIds.length === 0 && snap.exists) {
      const data = snap.data() || {};
      if (Array.isArray(data.tripIDs)) {
        tripIds = data.tripIDs.filter((id) => typeof id === "string" && id.trim());
      }
    }
  }

  if (tripIds.length === 0) return;

  const batch = db.batch();
  for (const id of tripIds) {
    const { ref } = await resolveTripRef(db, id, branchId);
    batch.update(ref, {
      "billing.paymentStatus": "paid",
      "billing.paymentSource": "stripe",
      "billing.paidAt": now,
      updatedAt: now,
    });
  }
  await batch.commit();
}

async function handlePaymentMethodAttached(db, pm) {
  const customerId = pm.customer;
  if (!customerId) return;
  const uid = await findUidForStripeCustomer(db, customerId);
  if (!uid) return;

  const stripe = getStripe();
  const customer = await stripe.customers.retrieve(customerId);
  const defaultPm =
    customer.invoice_settings?.default_payment_method === pm.id;
  await syncPaymentMethodToFirestore(db, uid, pm, defaultPm);
}

async function handlePaymentMethodDetached(db, pm) {
  const customerId = pm.customer;
  if (!customerId) return;
  const uid = await findUidForStripeCustomer(db, customerId);
  if (!uid) return;
  await db
    .collection(Collections.users)
    .doc(uid)
    .collection(PaymentMethodSubcollection)
    .doc(pm.id)
    .delete();
}

async function stripeWebhookHandler(req, res) {
  const stripe = getStripe();
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      stripeWebhookSecret.value()
    );
  } catch (err) {
    console.error("Webhook signature verification failed.", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const db = admin.firestore();
  const isNew = await recordPaymentEvent(db, event);
  if (!isNew) {
    res.json({ received: true, duplicate: true });
    return;
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(db, event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(db, event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(db, event.data.object);
        break;
      case "payment_method.attached":
        await handlePaymentMethodAttached(db, event.data.object);
        break;
      case "payment_method.detached":
        await handlePaymentMethodDetached(db, event.data.object);
        break;
      case "payment_method.automatically_updated":
        await handlePaymentMethodAttached(db, event.data.object);
        break;
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error", err);
    res.status(500).send("Webhook handler failed.");
  }
}

module.exports = { stripeWebhookHandler };
