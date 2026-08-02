const {
  stripeSecretKey,
  stripeWebhookSecret,
  getStripe,
  toStripeAmount,
} = require("./client");
const {
  syncUserStripeCustomer,
  syncCorporateStripeCustomer,
} = require("./customer");
const {
  paymentIntentAmountMatches,
  retrieveReusablePaymentIntent,
  cancelPaymentIntent,
  createTripCardPaymentIntent,
  createSavedCardSetupIntent,
} = require("./payments");
const {
  sendCustomerTripInvoice,
  sendCorporateInvoice,
} = require("./invoices");
const {
  syncPaymentMethodToFirestore,
  detachSavedCard,
  syncSavedCardsFromStripe,
  setDefaultSavedCard,
} = require("./saved-cards");
const { stripeWebhookHandler } = require("./webhook");

module.exports = {
  stripeSecretKey,
  stripeWebhookSecret,
  getStripe,
  toStripeAmount,
  syncUserStripeCustomer,
  syncCorporateStripeCustomer,
  paymentIntentAmountMatches,
  retrieveReusablePaymentIntent,
  cancelPaymentIntent,
  createTripCardPaymentIntent,
  createSavedCardSetupIntent,
  sendCustomerTripInvoice,
  sendCorporateInvoice,
  syncPaymentMethodToFirestore,
  detachSavedCard,
  syncSavedCardsFromStripe,
  setDefaultSavedCard,
  stripeWebhookHandler,
};
