const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { DEFAULT_BRANCH_ID } = require("../lib/collections");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { sendCustomerTripInvoice } = require("../stripe/invoices");
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
    const linkedBilling = linked.billing || {};
    const sameCustomer =
      !primary.customerID ||
      !linked.customerID ||
      primary.customerID === linked.customerID;
    const alreadyPaid = linkedBilling.paymentStatus === "paid";
    const alreadyInvoiced =
      linkedBilling.invoiceId && linkedBilling.paymentStatus === "invoiced";
    const paymentInProgress = linkedBilling.paymentStatus === "pending";
    if (sameCustomer && !alreadyPaid && !alreadyInvoiced && !paymentInProgress) {
      trips.push(linked);
      refs.push(loadedRefs[i]);
    }
  }

  return { trips, refs };
}

function assertTripInvoiceable(trip) {
  const billing = trip.billing || {};
  if (billing.paymentStatus === "paid") {
    throw new HttpsError("failed-precondition", "This booking is already paid.");
  }
  if (billing.paymentStatus === "pending") {
    throw new HttpsError("failed-precondition", "Payment is in progress for this booking.");
  }
  if (billing.invoiceId && billing.paymentStatus === "invoiced") {
    throw new HttpsError(
      "failed-precondition",
      "An invoice has already been sent for this booking."
    );
  }
  const total = Number(trip.quote?.quotedTotal);
  if (!Number.isFinite(total) || total <= 0) {
    throw new HttpsError(
      "failed-precondition",
      "This booking has no quoted total to invoice."
    );
  }
}

async function sendCustomerTripInvoiceHandler(request) {
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

  const currency = (primary.quote?.quotedCurrencyCode || "AUD").toLowerCase();
  const lineItems = lineItemsFromTrips(trips);

  const firestoreInvoice = await createFirestoreInvoice(db, {
    trips,
    status: "sent",
    source: "web",
    branchId,
  });

  const sent = await sendCustomerTripInvoice(db, {
    customerUid,
    branchId,
    invoiceId: firestoreInvoice.id,
    primaryTripId: primary.id,
    tripIds,
    lineItems,
    currencyCode: currency,
  });

  const now = admin.firestore.FieldValue.serverTimestamp();
  for (const ref of refs) {
    await ref.update({
      "billing.paymentStatus": "invoiced",
      "billing.paymentSource": "web",
      "billing.invoiceId": firestoreInvoice.id,
      updatedAt: now,
    });
  }

  return {
    invoiceId: firestoreInvoice.id,
    invoiceNumber: firestoreInvoice.invoiceNumber,
    stripeInvoiceId: sent.stripeInvoiceId,
    hostedInvoiceUrl: sent.hostedInvoiceUrl,
    tripIds,
  };
}

module.exports = { sendCustomerTripInvoiceHandler };
