const admin = require("firebase-admin");
const { Collections } = require("../lib/collections");
const { getStripe } = require("./client");

/**
 * Creates or updates a Stripe Customer for a user (personal cards / trip invoices).
 * Stores `stripeCustomerId` on `users/{uid}`.
 * @returns {Promise<string>} Stripe customer id
 */
async function syncUserStripeCustomer(db, uid) {
  const userRef = db.doc(`${Collections.users}/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new Error("User profile not found.");
  }

  const stripe = getStripe();
  const email = userSnap.get("email");
  const profile = userSnap.get("profile") || {};
  const name =
    typeof profile.displayName === "string" && profile.displayName.trim()
      ? profile.displayName.trim()
      : undefined;

  const payload = {
    email: typeof email === "string" && email.trim() ? email.trim() : undefined,
    name,
    metadata: { firebaseUid: uid },
  };

  const existing = userSnap.get("stripeCustomerId");
  if (typeof existing === "string" && existing.length > 0) {
    await stripe.customers.update(existing, payload);
    return existing;
  }

  const customer = await stripe.customers.create(payload);

  await userRef.set(
    {
      stripeCustomerId: customer.id,
      stripeCustomerCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return customer.id;
}

/**
 * Resolve invoice email: billingEmail → company email → billing contact email.
 * @param {FirebaseFirestore.Firestore} db
 * @param {Record<string, unknown>} account
 */
async function resolveCorporateInvoiceEmail(db, account) {
  const billingEmail =
    typeof account.billingEmail === "string" ? account.billingEmail.trim() : "";
  if (billingEmail) return billingEmail;

  const companyEmail = typeof account.email === "string" ? account.email.trim() : "";
  if (companyEmail) return companyEmail;

  const contactId =
    typeof account.billingContactUserId === "string"
      ? account.billingContactUserId.trim()
      : "";
  if (!contactId) return null;

  const contactSnap = await db.doc(`${Collections.users}/${contactId}`).get();
  if (!contactSnap.exists) return null;
  const contactEmail = contactSnap.get("email");
  return typeof contactEmail === "string" && contactEmail.trim()
    ? contactEmail.trim()
    : null;
}

/**
 * Build Stripe Customer create/update payload for a corporate account.
 * @param {string} accountId
 * @param {Record<string, unknown>} account
 * @param {string} email
 */
function corporateStripeCustomerPayload(accountId, account, email) {
  const name =
    typeof account.name === "string" && account.name.trim()
      ? account.name.trim()
      : undefined;
  const phone =
    typeof account.phone === "string" && account.phone.trim()
      ? account.phone.trim()
      : undefined;

  const line1 =
    typeof account.addressLine1 === "string" && account.addressLine1.trim()
      ? account.addressLine1.trim()
      : undefined;
  const line2 =
    typeof account.addressLine2 === "string" && account.addressLine2.trim()
      ? account.addressLine2.trim()
      : undefined;
  const city =
    typeof account.city === "string" && account.city.trim()
      ? account.city.trim()
      : undefined;
  const state =
    typeof account.state === "string" && account.state.trim()
      ? account.state.trim()
      : undefined;
  const postal_code =
    typeof account.postcode === "string" && account.postcode.trim()
      ? account.postcode.trim()
      : undefined;
  const country =
    typeof account.country === "string" && account.country.trim()
      ? account.country.trim()
      : undefined;

  const address =
    line1 || line2 || city || state || postal_code || country
      ? { line1, line2, city, state, postal_code, country }
      : undefined;

  /** @type {Record<string, string>} */
  const metadata = { firebaseCorporateAccountId: accountId };
  const billingContactUserId =
    typeof account.billingContactUserId === "string"
      ? account.billingContactUserId.trim()
      : "";
  if (billingContactUserId) {
    metadata.billingContactUserId = billingContactUserId;
  }
  const abn = typeof account.abn === "string" ? account.abn.trim() : "";
  if (abn) metadata.abn = abn;
  const acn = typeof account.acn === "string" ? account.acn.trim() : "";
  if (acn) metadata.acn = acn;

  return {
    email,
    name,
    phone,
    address,
    description: name ? `Corporate account: ${name}` : undefined,
    metadata,
  };
}

/**
 * Creates or updates a Stripe Customer for a corporate account.
 * Stores `stripeCustomerId` on `corporateAccounts/{id}`.
 * @returns {Promise<string>} Stripe customer id
 */
async function syncCorporateStripeCustomer(db, accountId) {
  if (typeof accountId !== "string" || !accountId.trim()) {
    throw new Error("corporateAccountId is required.");
  }

  const accountRef = db.doc(`${Collections.corporateAccounts}/${accountId.trim()}`);
  const accountSnap = await accountRef.get();
  if (!accountSnap.exists) {
    throw new Error("Corporate account not found.");
  }

  const account = accountSnap.data() || {};
  const email = await resolveCorporateInvoiceEmail(db, account);
  if (!email) {
    throw new Error(
      "Set an accounts email, company email, or billing contact before linking Stripe."
    );
  }

  const stripe = getStripe();
  const payload = corporateStripeCustomerPayload(accountSnap.id, account, email);

  const existing = account.stripeCustomerId;
  if (typeof existing === "string" && existing.length > 0) {
    await stripe.customers.update(existing, payload);
    return existing;
  }

  const customer = await stripe.customers.create(payload);

  await accountRef.set(
    {
      stripeCustomerId: customer.id,
      stripeCustomerCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return customer.id;
}

module.exports = {
  syncUserStripeCustomer,
  syncCorporateStripeCustomer,
};
