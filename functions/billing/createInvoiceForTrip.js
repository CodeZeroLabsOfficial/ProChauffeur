const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { DEFAULT_BRANCH_ID, resolveInvoiceRef } = require("../lib/collections");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { getStripe, toStripeAmount } = require("../stripe/client");
const { syncUserStripeCustomer } = require("../stripe/customer");
const {
  lineItemsFromTrips,
  createFirestoreInvoice,
  loadTripsForPaymentInvoice,
} = require("./invoiceFromTrip");

/**
 * Admin "send invoice" eligibility: include the primary trip plus linked
 * companions that are still unpaid / uninvoiced for the same customer.
 */
function filterAdminInvoiceableTrips(loadedTrips, loadedRefs) {
  if (!loadedTrips.length) {
    return { trips: [], refs: [] };
  }

  const primary = loadedTrips[0];
  const trips = [primary];
  const refs = [loadedRefs[0]];

  for (let i = 1; i < loadedTrips.length; i++) {
    const linked = loadedTrips[i];
    const sameCustomer =
      !primary.customerID ||
      !linked.customerID ||
      primary.customerID === linked.customerID;
    const alreadyPaid = linked.paymentStatus === "paid";
    const alreadyInvoiced =
      linked.invoiceId && linked.paymentStatus === "invoiced";
    const paymentInProgress = linked.paymentStatus === "pending";
    if (sameCustomer && !alreadyPaid && !alreadyInvoiced && !paymentInProgress) {
      trips.push(linked);
      refs.push(loadedRefs[i]);
    }
  }

  return { trips, refs };
}

function assertTripInvoiceable(trip) {
  if (trip.paymentStatus === "paid") {
    throw new HttpsError("failed-precondition", "This booking is already paid.");
  }
  if (trip.paymentStatus === "pending") {
    throw new HttpsError("failed-precondition", "Payment is in progress for this booking.");
  }
  if (trip.invoiceId && trip.paymentStatus === "invoiced") {
    throw new HttpsError(
      "failed-precondition",
      "An invoice has already been sent for this booking."
    );
  }
  const total = Number(trip.quotedTotal);
  if (!Number.isFinite(total) || total <= 0) {
    throw new HttpsError(
      "failed-precondition",
      "This booking has no quoted total to invoice."
    );
  }
}

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

  let loaded;
  try {
    loaded = await loadTripsForPaymentInvoice(db, [tripId.trim()], branchId);
  } catch (err) {
    throw new HttpsError("not-found", err.message || "Trip not found.");
  }

  const { trips, refs } = filterAdminInvoiceableTrips(loaded.trips, loaded.refs);
  for (const trip of trips) {
    assertTripInvoiceable(trip);
  }

  const primary = trips[0];
  const tripIds = trips.map((t) => t.id);

  const customerUid = primary.customerID;
  if (!customerUid) {
    throw new HttpsError("failed-precondition", "Trip has no customer.");
  }

  const stripeCustomerId = await syncUserStripeCustomer(db, customerUid);
  const stripe = getStripe();
  const currency = (primary.quotedCurrencyCode || "AUD").toLowerCase();
  const lineItems = lineItemsFromTrips(trips);

  const firestoreInvoice = await createFirestoreInvoice(db, {
    trips,
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
      tripId: primary.id,
      tripIds: JSON.stringify(tripIds),
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

  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const ref of refs) {
    await ref.update({
      paymentStatus: "invoiced",
      paymentSource: "web",
      invoiceId: firestoreInvoice.id,
      updatedAt: now,
    });
  }

  return {
    invoiceId: firestoreInvoice.id,
    invoiceNumber: firestoreInvoice.invoiceNumber,
    stripeInvoiceId: finalized.id,
    hostedInvoiceUrl: finalized.hosted_invoice_url || null,
    tripIds,
  };
}

module.exports = { createInvoiceForTripHandler };
