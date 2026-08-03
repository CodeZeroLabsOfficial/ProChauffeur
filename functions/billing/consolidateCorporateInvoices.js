const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const {
  Collections,
  invoicesCollection,
} = require("../lib/collections");
const { requireAuth, requireAdmin } = require("../lib/auth");
const { sendCorporateInvoice } = require("../stripe/invoices");

function invoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`;
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

/** @param {Date} date */
function lastDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Whether `today` matches the account's billingDay ("last" or 1–28).
 * @param {"last"|number|string} billingDay
 * @param {Date} today
 */
function isBillingDayToday(billingDay, today = new Date()) {
  const dayOfMonth = today.getDate();
  if (billingDay === "last") {
    return dayOfMonth === lastDayOfMonth(today);
  }
  const dayNum = typeof billingDay === "number" ? billingDay : Number(billingDay);
  if (!Number.isFinite(dayNum) || dayNum < 1 || dayNum > 28) return false;
  return dayOfMonth === dayNum;
}

/** Calendar period for the invoice (previous month through yesterday, or MTD). */
function billingPeriodForToday(today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  const start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0, 0);
  return { start, end };
}

/**
 * Loads on-account trips for a corporate account under one branch that are not yet invoiced.
 */
async function fetchUninvoicedOnAccountTrips(db, branchId, corporateAccountId) {
  const tripsRef = db.collection(
    `${Collections.branches}/${branchId}/${Collections.trips}`
  );
  const snap = await tripsRef
    .where("billing.corporateAccountId", "==", corporateAccountId)
    .get();

  return snap.docs
    .map((doc) => ({ id: doc.id, ref: doc.ref, ...(doc.data() || {}) }))
    .filter(
      (trip) =>
        trip.billing?.paymentStatus === "on_account" &&
        !trip.billing?.invoiceId &&
        trip.status !== "cancelled"
    );
}

/**
 * Builds and writes a consolidated corporate invoice for trips under one branch,
 * then sends a Stripe Invoice to the corporate customer.
 */
async function createCorporateInvoice(db, {
  account,
  branchId,
  trips,
  billingPeriodStart,
  billingPeriodEnd,
  sendStripe = true,
}) {
  const first = trips[0];
  const lineItems = trips.map((trip) => ({
    id: cryptoRandomId(),
    label: `Trip ${trip.id.slice(0, 8)}${trip.customer?.displayName ? ` — ${trip.customer.displayName}` : ""}`,
    amount: Number(trip.quote?.quotedTotal) || 0,
  }));

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const taxRate = Number(first.quote?.quotedTaxRate) || 0;
  const taxAmount = trips.reduce((sum, t) => sum + (Number(t.quote?.quotedTaxAmount) || 0), 0);
  const total = trips.reduce((sum, t) => sum + (Number(t.quote?.quotedTotal) || 0), 0);

  const paymentTermsDays =
    typeof account.paymentTermsDays === "number" && Number.isFinite(account.paymentTermsDays)
      ? Math.max(0, account.paymentTermsDays)
      : 0;

  const now = admin.firestore.Timestamp.now();
  const dueAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + paymentTermsDays * 24 * 60 * 60 * 1000)
  );

  const customerID = first.customerID || null;
  const customerName =
    account.name || first.customer?.displayName || "Corporate account";
  const customerEmail =
    account.billingEmail || account.email || first.customer?.email || null;
  const customerPhone =
    account.billingPhone || account.phone || first.customer?.phoneNumber || null;

  const tripIds = trips.map((t) => t.id);
  const number = invoiceNumber();
  const ref = invoicesCollection(db, branchId).doc();
  const currencyCode = (first.quote?.quotedCurrencyCode || "AUD").toUpperCase();
  const payload = {
    id: ref.id,
    invoiceNumber: number,
    customerID: customerID || account.id,
    customerName,
    customerEmail,
    customerPhone,
    tripIDs: tripIds,
    branchId,
    status: "sent",
    currencyCode,
    lineItems,
    subtotal: Number.isFinite(subtotal) ? subtotal : total,
    taxRate,
    taxAmount,
    total,
    issuedAt: now,
    dueAt,
    paidAt: null,
    notes: null,
    source: "web",
    corporateAccountId: account.id,
    billingPeriodStart: admin.firestore.Timestamp.fromDate(billingPeriodStart),
    billingPeriodEnd: admin.firestore.Timestamp.fromDate(billingPeriodEnd),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(ref, payload);
  for (const trip of trips) {
    batch.update(trip.ref, {
      "billing.invoiceId": ref.id,
      "billing.paymentStatus": "invoiced",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();

  /** @type {{ stripeInvoiceId?: string, hostedInvoiceUrl?: string|null, stripeError?: string }} */
  const stripeResult = {};
  if (sendStripe) {
    try {
      const sent = await sendCorporateInvoice(db, {
        account,
        branchId,
        invoiceId: ref.id,
        invoiceNumber: number,
        tripIds,
        lineItems,
        currencyCode,
        paymentTermsDays,
      });
      stripeResult.stripeInvoiceId = sent.stripeInvoiceId;
      stripeResult.hostedInvoiceUrl = sent.hostedInvoiceUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Stripe invoice send failed.";
      console.error("sendCorporateInvoice failed", {
        invoiceId: ref.id,
        corporateAccountId: account.id,
        message,
      });
      stripeResult.stripeError = message;
    }
  }

  return {
    invoiceId: ref.id,
    tripCount: trips.length,
    total,
    ...stripeResult,
  };
}

/**
 * Runs consolidation for active corporate accounts.
 */
async function consolidateCorporateInvoices(
  db,
  { force = false, corporateAccountId = null } = {}
) {
  const today = new Date();
  const { start: billingPeriodStart, end: billingPeriodEnd } = billingPeriodForToday(today);
  const branchesSnap = await db.collection(Collections.branches).get();
  const branchIds = branchesSnap.docs.map((d) => d.id);

  let accountsSnap;
  if (typeof corporateAccountId === "string" && corporateAccountId.trim()) {
    const accountDoc = await db
      .doc(`${Collections.corporateAccounts}/${corporateAccountId.trim()}`)
      .get();
    if (!accountDoc.exists) {
      throw new HttpsError("not-found", "Corporate account not found.");
    }
    accountsSnap = { docs: [accountDoc] };
  } else {
    accountsSnap = await db
      .collection(Collections.corporateAccounts)
      .where("status", "==", "active")
      .get();
  }

  let accountsProcessed = 0;
  let invoicesCreated = 0;
  const results = [];

  for (const accountDoc of accountsSnap.docs) {
    const account = { id: accountDoc.id, ...(accountDoc.data() || {}) };
    if (account.status && account.status !== "active") {
      continue;
    }
    if (!force && !isBillingDayToday(account.billingDay, today)) {
      continue;
    }
    accountsProcessed += 1;

    for (const branchId of branchIds) {
      const trips = await fetchUninvoicedOnAccountTrips(db, branchId, account.id);
      if (trips.length === 0) continue;

      const invoice = await createCorporateInvoice(db, {
        account,
        branchId,
        trips,
        billingPeriodStart,
        billingPeriodEnd,
        sendStripe: true,
      });
      invoicesCreated += 1;
      results.push({
        corporateAccountId: account.id,
        branchId,
        ...invoice,
      });
    }
  }

  return { accountsProcessed, invoicesCreated, results };
}

async function consolidateCorporateInvoicesHandler() {
  const db = admin.firestore();
  return consolidateCorporateInvoices(db, { force: false });
}

async function consolidateCorporateInvoicesCallableHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireAdmin(db, uid);
  const force = request.data?.force === true;
  const corporateAccountId =
    typeof request.data?.corporateAccountId === "string"
      ? request.data.corporateAccountId.trim()
      : typeof request.data?.accountId === "string"
        ? request.data.accountId.trim()
        : null;
  return consolidateCorporateInvoices(db, {
    force: force || Boolean(corporateAccountId),
    corporateAccountId: corporateAccountId || null,
  });
}

module.exports = {
  consolidateCorporateInvoicesHandler,
  consolidateCorporateInvoicesCallableHandler,
  isBillingDayToday,
  consolidateCorporateInvoices,
};
