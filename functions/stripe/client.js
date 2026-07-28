const Stripe = require("stripe");
const { defineSecret } = require("firebase-functions/params");

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

// Reuse the Stripe client across warm invocations; only rebuild it if the
// resolved secret changes (e.g. key rotation).
let cachedStripe = null;
let cachedStripeKey = null;

function getStripe() {
  const key = stripeSecretKey.value();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (cachedStripe && cachedStripeKey === key) {
    return cachedStripe;
  }
  cachedStripe = new Stripe(key);
  cachedStripeKey = key;
  return cachedStripe;
}

/** Currencies with no minor units; hoisted so it is not rebuilt per call. */
const ZERO_DECIMAL_CURRENCIES = new Set(["jpy", "krw"]);

/** Major currency units (e.g. 104.50 AUD) → Stripe integer amount. */
function toStripeAmount(amount, currencyCode) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Invalid payment amount.");
  }
  const code = String(currencyCode || "aud").toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(n);
  }
  return Math.round(n * 100);
}

module.exports = {
  stripeSecretKey,
  stripeWebhookSecret,
  getStripe,
  toStripeAmount,
};
