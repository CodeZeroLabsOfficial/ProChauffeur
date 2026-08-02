const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

const { stripeSecretKey, stripeWebhookSecret } = require("./stripe/client");
const { mapboxAccessToken } = require("./quoting/mapbox-token");
const { stripeWebhookHandler } = require("./stripe/webhook");
const { createTripCardPaymentHandler } = require("./billing/createTripCardPayment");
const { sendCustomerTripInvoiceHandler } = require("./billing/sendCustomerTripInvoice");
const { prepareSavedCardHandler } = require("./billing/prepareSavedCard");
const {
  removeSavedCardHandler,
  setDefaultSavedCardHandler,
  syncSavedCardsHandler,
} = require("./billing/savedCards");
const { claimCorporateJoinCodeHandler } = require("./billing/claimCorporateJoinCode");
const { computeQuoteHandler } = require("./billing/computeQuote");
const {
  consolidateCorporateInvoicesHandler,
  consolidateCorporateInvoicesCallableHandler,
} = require("./billing/consolidateCorporateInvoices");
const {
  syncCorporateStripeCustomerHandler,
} = require("./billing/syncCorporateStripeCustomer");
const { markInvoicePaidHandler } = require("./billing/markInvoicePaid");

setGlobalOptions({ region: "australia-southeast1" });

admin.initializeApp();

const callableOptions = { secrets: [stripeSecretKey] };
const tripCardPaymentOptions = { secrets: [stripeSecretKey, mapboxAccessToken] };
const computeQuoteOptions = { secrets: [mapboxAccessToken] };
const consolidateScheduleOptions = {
  schedule: "0 1 * * *",
  timeZone: "Australia/Sydney",
  secrets: [stripeSecretKey],
};

exports.createTripCardPayment = onCall(tripCardPaymentOptions, createTripCardPaymentHandler);
exports.prepareSavedCard = onCall(callableOptions, prepareSavedCardHandler);
exports.removeSavedCard = onCall(callableOptions, removeSavedCardHandler);
exports.setDefaultSavedCard = onCall(callableOptions, setDefaultSavedCardHandler);
exports.syncSavedCards = onCall(callableOptions, syncSavedCardsHandler);
exports.sendCustomerTripInvoice = onCall(callableOptions, sendCustomerTripInvoiceHandler);
exports.syncCorporateStripeCustomer = onCall(
  callableOptions,
  syncCorporateStripeCustomerHandler
);
exports.markInvoicePaid = onCall(callableOptions, markInvoicePaidHandler);

exports.claimCorporateJoinCode = onCall(claimCorporateJoinCodeHandler);
exports.computeQuote = onCall(computeQuoteOptions, computeQuoteHandler);
exports.generateCorporatePeriodInvoice = onCall(
  callableOptions,
  consolidateCorporateInvoicesCallableHandler
);
exports.consolidateCorporateInvoices = onSchedule(
  consolidateScheduleOptions,
  async () => {
    await consolidateCorporateInvoicesHandler();
  }
);

exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  stripeWebhookHandler
);

/**
 * Admin-only: deletes the Firebase Authentication user for a driver account.
 */
exports.deleteDriverAuth = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }

  const callerUid = request.auth.uid;
  const targetUid = request.data?.targetUid;

  if (typeof targetUid !== "string" || targetUid.length === 0) {
    throw new HttpsError("invalid-argument", "targetUid is required.");
  }

  if (callerUid === targetUid) {
    throw new HttpsError("permission-denied", "You cannot remove your own account here.");
  }

  const db = admin.firestore();
  const callerSnap = await db.doc(`users/${callerUid}`).get();
  if (!callerSnap.exists || callerSnap.get("role") !== "admin") {
    throw new HttpsError("permission-denied", "Only fleet admins can remove driver logins.");
  }

  const targetSnap = await db.doc(`users/${targetUid}`).get();
  if (!targetSnap.exists || targetSnap.get("role") !== "driver") {
    throw new HttpsError("failed-precondition", "That account is not an active driver profile.");
  }

  try {
    await admin.auth().deleteUser(targetUid);
  } catch (e) {
    if (e?.code === "auth/user-not-found") {
      return { ok: true, authDeleted: false };
    }
    throw new HttpsError("internal", e?.message ?? "Could not delete authentication for this driver.");
  }

  return { ok: true, authDeleted: true };
});
