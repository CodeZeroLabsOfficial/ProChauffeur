const admin = require("firebase-admin");
const { getStripe, toStripeAmount } = require("../stripe/client");
const { syncCorporateStripeCustomer } = require("../stripe/customer");
const { resolveInvoiceRef } = require("../lib/collections");

/**
 * Create, finalize, and email a Stripe Invoice for a consolidated corporate invoice.
 * @returns {Promise<{ stripeInvoiceId: string, hostedInvoiceUrl: string|null }>}
 */
async function sendCorporateStripeInvoice(db, {
  account,
  branchId,
  invoiceId,
  invoiceNumber,
  tripIds,
  lineItems,
  currencyCode,
  paymentTermsDays,
}) {
  const stripeCustomerId = await syncCorporateStripeCustomer(db, account.id);
  const stripe = getStripe();
  const currency = String(currencyCode || "AUD").toLowerCase();
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
      branchId,
      tripIds: JSON.stringify(tripIds || []),
      source: "corporate_period",
    },
  });

  const finalized = await stripe.invoices.finalizeInvoice(stripeInvoice.id);
  await stripe.invoices.sendInvoice(finalized.id);

  const { ref: invoiceDoc } = await resolveInvoiceRef(db, invoiceId, branchId);
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

module.exports = { sendCorporateStripeInvoice };
