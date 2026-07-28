const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { DEFAULT_BRANCH_ID, resolveTripRef, resolveInvoiceRef } = require("../lib/collections");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { getStripe, toStripeAmount } = require("../stripe/client");
const { syncUserStripeCustomer } = require("../stripe/customer");
const { lineItemsFromTrip, createFirestoreInvoice } = require("./invoiceFromTrip");

async function createInvoiceForTripHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireAdmin(db, uid);

  const tripId = request.data?.tripId;
  if (typeof tripId !== "string" || !tripId.trim()) {
    throw new HttpsError("invalid-argument", "tripId is required.");
  }

  const branchId =
    typeof request.data?.branchId === "string" && request.data.branchId.trim()
      ? request.data.branchId.trim()
      : DEFAULT_BRANCH_ID;

  const { ref: tripRef, snap: tripSnap } = await resolveTripRef(db, tripId, branchId);
  if (!tripSnap.exists) {
    throw new HttpsError("not-found", "Trip not found.");
  }
  const trip = { id: tripSnap.id, ...tripSnap.data() };

  if (trip.paymentStatus === "paid") {
    throw new HttpsError("failed-precondition", "This booking is already paid.");
  }
  if (trip.paymentStatus === "pending") {
    throw new HttpsError("failed-precondition", "Payment is in progress for this booking.");
  }
  if (trip.invoiceId && trip.paymentStatus === "invoiced") {
    throw new HttpsError("failed-precondition", "An invoice has already been sent for this booking.");
  }

  const total = Number(trip.quotedTotal);
  if (!Number.isFinite(total) || total <= 0) {
    throw new HttpsError("failed-precondition", "This booking has no quoted total to invoice.");
  }

  const customerUid = trip.customerID;
  if (!customerUid) {
    throw new HttpsError("failed-precondition", "Trip has no customer.");
  }

  const stripeCustomerId = await syncUserStripeCustomer(db, customerUid);
  const stripe = getStripe();
  const currency = (trip.quotedCurrencyCode || "AUD").toLowerCase();
  const lineItems = lineItemsFromTrip(trip);

  const firestoreInvoice = await createFirestoreInvoice(db, {
    trip,
    tripIds: [tripId],
    status: "sent",
    source: "web",
    branchId,
  });

  for (const line of lineItems) {
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: toStripeAmount(line.amount, currency),
      currency,
      description: line.label,
    });
  }

  const stripeInvoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    collection_method: "send_invoice",
    days_until_due: 14,
    metadata: {
      firebaseUid: customerUid,
      tripId,
      invoiceId: firestoreInvoice.id,
      branchId,
      source: "web",
    },
  });

  const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
  await stripe.invoices.sendInvoice(finalized.id);

  const { ref: invoiceDoc } = await resolveInvoiceRef(db, firestoreInvoice.id, branchId);
  await invoiceDoc.update({
    stripeInvoiceId: finalized.id,
    stripeHostedInvoiceUrl: finalized.hosted_invoice_url || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await tripRef.update({
    paymentStatus: "invoiced",
    paymentSource: "web",
    invoiceId: firestoreInvoice.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    invoiceId: firestoreInvoice.id,
    invoiceNumber: firestoreInvoice.invoiceNumber,
    stripeInvoiceId: finalized.id,
    hostedInvoiceUrl: finalized.hosted_invoice_url || null,
  };
}

module.exports = { createInvoiceForTripHandler };
