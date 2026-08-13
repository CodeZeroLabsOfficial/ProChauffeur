const admin = require("firebase-admin");
const { requireBranchId, resolveInvoiceRef } = require("../lib/collections");
const { getStripe, toStripeAmount } = require("./client");
const { syncUserStripeCustomer, syncCorporateStripeCustomer } = require("./customer");

/**
 * Create, finalize, and email a Stripe Invoice for a customer trip invoice.
 * Updates the Firestore invoice doc with Stripe ids/URL.
 * @returns {Promise<{ stripeInvoiceId: string, hostedInvoiceUrl: string|null }>}
 */
async function sendCustomerTripInvoice(db, {
  customerUid,
  branchId,
  invoiceId,
  primaryTripId,
  tripIds,
  lineItems,
  currencyCode,
}) {
  const resolvedBranchId = requireBranchId(branchId);
  const stripeCustomerId = await syncUserStripeCustomer(db, customerUid);
  const stripe = getStripe();
  if (typeof currencyCode !== "string" || !currencyCode.trim()) {
    throw new Error("Invoice is missing currency.");
  }
  const currency = currencyCode.trim().toLowerCase();

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
      tripId: primaryTripId,
      tripIds: JSON.stringify(tripIds || []),
      invoiceId,
      branchId: resolvedBranchId,
      source: "web",
    },
  });

  const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
  await stripe.invoices.sendInvoice(finalized.id);

  const { ref: invoiceDoc } = await resolveInvoiceRef(db, invoiceId, resolvedBranchId);
  await invoiceDoc.update({
    stripeInvoiceId: finalized.id,
    stripeHostedInvoiceUrl: finalized.hosted_invoice_url || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    stripeInvoiceId: finalized.id,
    hostedInvoiceUrl: finalized.hosted_invoice_url || null,
  };
}

/**
 * Create, finalize, and email a Stripe Invoice for a consolidated corporate invoice.
 * @returns {Promise<{ stripeInvoiceId: string, hostedInvoiceUrl: string|null }>}
 */
async function sendCorporateInvoice(db, {
  account,
  branchId,
  invoiceId,
  invoiceNumber,
  tripIds,
  lineItems,
  currencyCode,
  paymentTermsDays,
}) {
  const resolvedBranchId = requireBranchId(branchId);
  const stripeCustomerId = await syncCorporateStripeCustomer(db, account.id);
  const stripe = getStripe();
  if (typeof currencyCode !== "string" || !currencyCode.trim()) {
    throw new Error("Invoice is missing currency.");
  }
  const currency = currencyCode.trim().toLowerCase();
  const daysUntilDue = Math.max(
    1,
    typeof paymentTermsDays === "number" && Number.isFinite(paymentTermsDays)
      ? Math.floor(paymentTermsDays)
      : 14
  );

  const billableLines = (lineItems || []).filter(
    (line) => typeof line.amount === "number" && Number.isFinite(line.amount) && line.amount > 0
  );
  if (billableLines.length === 0) {
    throw new Error("Invoice has no billable line items for Stripe.");
  }

  for (const line of billableLines) {
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: toStripeAmount(line.amount, currency),
      currency,
      description: line.label || "Trip",
    });
  }

  const stripeInvoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    collection_method: "send_invoice",
    days_until_due: daysUntilDue,
    metadata: {
      invoiceId,
      invoiceNumber: invoiceNumber || "",
      corporateAccountId: account.id,
      branchId: resolvedBranchId,
      tripIds: JSON.stringify(tripIds || []),
      source: "corporate_period",
    },
  });

  const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
  await stripe.invoices.sendInvoice(finalized.id);

  const { ref: invoiceDoc } = await resolveInvoiceRef(db, invoiceId, resolvedBranchId);
  await invoiceDoc.update({
    stripeInvoiceId: finalized.id,
    stripeHostedInvoiceUrl: finalized.hosted_invoice_url || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    stripeInvoiceId: finalized.id,
    hostedInvoiceUrl: finalized.hosted_invoice_url || null,
  };
}

module.exports = {
  sendCustomerTripInvoice,
  sendCorporateInvoice,
};
