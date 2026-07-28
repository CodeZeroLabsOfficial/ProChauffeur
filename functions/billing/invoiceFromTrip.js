const admin = require("firebase-admin");
const { DEFAULT_BRANCH_ID, invoicesCollection } = require("../lib/collections");

function lineItemsFromTrip(trip) {
  const breakdown = Array.isArray(trip.quoteBreakdown) ? trip.quoteBreakdown : [];
  const addons = breakdown.filter((line) => line && line.category === "addon");
  const taxLine = breakdown.find((line) => line && line.category === "tax");

  const addonTotal = addons.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const subtotal = Number(trip.quotedSubtotal) || 0;
  const farePortion = subtotal - addonTotal;

  const items = [];

  if (farePortion > 0) {
    items.push({ id: cryptoRandomId(), label: "Fare", amount: farePortion });
  }

  for (const addon of addons) {
    items.push({
      id: addon.id || cryptoRandomId(),
      label: String(addon.label || "Add-on"),
      amount: Number(addon.amount) || 0,
    });
  }

  const taxAmount = Number(trip.quotedTaxAmount) || 0;
  if (taxAmount > 0) {
    const taxLabel = taxLine ? String(taxLine.label || "GST") : "GST";
    items.push({ id: cryptoRandomId(), label: taxLabel, amount: taxAmount });
  }

  if (items.length === 0 && Number(trip.quotedTotal) > 0) {
    items.push({ id: cryptoRandomId(), label: "Trip fare", amount: Number(trip.quotedTotal) });
  }

  return items;
}

function totalsFromTrip(trip) {
  const subtotal = Number(trip.quotedSubtotal) || 0;
  const taxRate = Number(trip.quotedTaxRate) || 0;
  const taxAmount = Number(trip.quotedTaxAmount) || 0;
  const total = Number(trip.quotedTotal) || 0;
  return { subtotal, taxRate, taxAmount, total };
}

function invoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`;
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

async function createFirestoreInvoice(db, {
  trip,
  tripIds,
  status,
  source,
  branchId = DEFAULT_BRANCH_ID,
  stripeFields = {},
}) {
  const lineItems = lineItemsFromTrip(trip);
  const totals = totalsFromTrip(trip);
  const totalFromTrip = Number(trip.quotedTotal);
  const total = Number.isFinite(totalFromTrip) && totalFromTrip > 0 ? totalFromTrip : totals.total;

  const now = admin.firestore.Timestamp.now();
  const dueAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  );

  // Pre-generate the document ref so the `id` field is written with the rest of
  // the payload in a single `set` instead of an `add` followed by an `update`.
  // The persisted document is identical; we just avoid a redundant write.
  const ref = invoicesCollection(db, branchId).doc();

  const payload = {
    invoiceNumber: invoiceNumber(),
    customerID: trip.customerID,
    customerName: trip.customerDisplayName || "Customer",
    customerEmail: trip.customerEmail || null,
    customerPhone: trip.customerPhoneNumber || null,
    tripIDs: tripIds,
    branchId,
    status,
    currencyCode: (trip.quotedCurrencyCode || "AUD").toUpperCase(),
    lineItems,
    subtotal: totals.subtotal,
    taxRate: totals.taxRate,
    taxAmount: totals.taxAmount,
    total,
    issuedAt: now,
    dueAt: status === "paid" ? null : dueAt,
    paidAt: status === "paid" ? now : null,
    notes: null,
    source,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...stripeFields,
    // Written last so `id` always resolves to the document id, matching the
    // original add()+update({ id }) ordering even if stripeFields carried an id.
    id: ref.id,
  };

  await ref.set(payload);
  return { ...payload };
}

module.exports = {
  lineItemsFromTrip,
  createFirestoreInvoice,
};
