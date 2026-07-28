const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { syncCorporateStripeCustomer } = require("../stripe/customer");

/**
 * Admin callable: create or update the Stripe Customer for a corporate account.
 */
async function syncCorporateStripeCustomerHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireAdmin(db, uid);

  const accountId = request.data?.corporateAccountId ?? request.data?.accountId;
  if (typeof accountId !== "string" || !accountId.trim()) {
    throw new HttpsError("invalid-argument", "corporateAccountId is required.");
  }

  try {
    const stripeCustomerId = await syncCorporateStripeCustomer(db, accountId.trim());
    return { stripeCustomerId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not sync Stripe customer.";
    if (
      message.includes("not found") ||
      message.includes("required") ||
      message.includes("accounts email")
    ) {
      throw new HttpsError(
        message.includes("not found") ? "not-found" : "failed-precondition",
        message
      );
    }
    throw new HttpsError("internal", message);
  }
}

module.exports = { syncCorporateStripeCustomerHandler };
