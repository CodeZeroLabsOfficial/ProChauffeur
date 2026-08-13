const admin = require("firebase-admin");
const {
  DEFAULT_BRANCH_ID,
  invoicesCollection,
  resolveTripRef,
} = require("../lib/collections");

/** Operator-facing timezone for invoice transfer labels. */
const INVOICE_TIME_ZONE = "Australia/Brisbane";

/**
 * Resolves `scheduledPickupAt` from Firestore Timestamp, Date, ISO string, or
 * `{ seconds, nanoseconds }` shapes into a `Date`.
 */
function tripPickupDate(trip) {
  const value = trip?.journey?.scheduledPickupAt;
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value.toDate === "function") {
    try {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
  }
  return null;
}

/**
 * Customer invoice fare label.
 *
 * - One-way: `Transfer · 2 Aug · 10:00`
 * - Return leg 0/1: `Outbound transfer · …` / `Return transfer · …`
 * - Extra legs: `Transfer 3 · …`
 *
 * @param {object} trip
 * @param {"oneWay"|"outbound"|"return"|string} [legKind="oneWay"]
 */
function transferLineLabel(trip, legKind = "oneWay") {
  const base =
    legKind === "outbound"
      ? "Outbound transfer"
      : legKind === "return"
        ? "Return transfer"
        : typeof legKind === "string" && legKind.startsWith("trip")
          ? `Transfer ${legKind.slice(4)}`
          : "Transfer";

  const date = tripPickupDate(trip);
  if (!date) return base;

  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: INVOICE_TIME_ZONE,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value;
  const day = get("day");
  const month = get("month");
  const hour = get("hour");
  const minute = get("minute");
  if (!day || !month || hour == null || minute == null) return base;
  return `${base} · ${day} ${month} · ${hour}:${minute}`;
}

function taxLabelFromTrip(trip) {
  const breakdown = Array.isArray(trip.quote?.quoteBreakdown) ? trip.quote.quoteBreakdown : [];
  const taxLine = breakdown.find((line) => line && line.category === "tax");
  const label = typeof taxLine?.label === "string" ? taxLine.label.trim() : "";
  return label || "Tax";
}

/**
 * Line items for one trip: transfer fare row, then add-ons, optional tax.
 *
 * @param {{ includeTax?: boolean, legKind?: string }} options When `includeTax`
 *   is false, tax is omitted (multi-leg invoices append a single combined GST).
 */
function lineItemsFromTrip(trip, { includeTax = true, legKind = "oneWay" } = {}) {
  const breakdown = Array.isArray(trip.quote?.quoteBreakdown) ? trip.quote.quoteBreakdown : [];
  const addons = breakdown.filter((line) => line && line.category === "addon");

  const addonTotal = addons.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const subtotal = Number(trip.quote?.quotedSubtotal) || 0;
  const farePortion = subtotal - addonTotal;
  const fareLabel = transferLineLabel(trip, legKind);

  const items = [];

  if (farePortion > 0) {
    items.push({
      id: cryptoRandomId(),
      label: fareLabel,
      amount: farePortion,
    });
  }

  for (const addon of addons) {
    items.push({
      id: addon.id || cryptoRandomId(),
      label: String(addon.label || "Add-on"),
      amount: Number(addon.amount) || 0,
    });
  }

  if (includeTax) {
    const taxAmount = Number(trip.quote?.quotedTaxAmount) || 0;
    if (taxAmount > 0) {
      items.push({
        id: cryptoRandomId(),
        label: taxLabelFromTrip(trip),
        amount: taxAmount,
      });
    }
  }

  if (items.length === 0 && Number(trip.quote?.quotedTotal) > 0) {
    items.push({
      id: cryptoRandomId(),
      label: fareLabel,
      amount: Number(trip.quote.quotedTotal),
    });
  }

  return items;
}

/** Leg kind for invoice fare labels from trip index in a multi-leg invoice. */
function legKindForIndex(index) {
  if (index === 0) return "outbound";
  if (index === 1) return "return";
  return `trip${index + 1}`;
}

/**
 * Builds customer-facing line items for one or more trips.
 *
 * Multi-trip invoices use `Outbound transfer` / `Return transfer` (with date ·
 * time), plus that leg's add-ons, then a single combined tax row.
 */
function lineItemsFromTrips(trips) {
  if (!Array.isArray(trips) || trips.length === 0) return [];
  if (trips.length === 1) {
    return lineItemsFromTrip(trips[0], { includeTax: true, legKind: "oneWay" });
  }

  const items = [];
  let taxAmount = 0;
  let taxLabel = "Tax";

  trips.forEach((trip, index) => {
    items.push(
      ...lineItemsFromTrip(trip, {
        includeTax: false,
        legKind: legKindForIndex(index),
      })
    );
    const tripTax = Number(trip.quote?.quotedTaxAmount) || 0;
    if (tripTax > 0) {
      taxAmount += tripTax;
      taxLabel = taxLabelFromTrip(trip);
    }
  });

  if (taxAmount > 0) {
    items.push({ id: cryptoRandomId(), label: taxLabel, amount: taxAmount });
  }

  return items;
}

function totalsFromTrip(trip) {
  const quote = trip.quote || {};
  const subtotal = Number(quote.quotedSubtotal) || 0;
  const taxRate = Number(quote.quotedTaxRate) || 0;
  const taxAmount = Number(quote.quotedTaxAmount) || 0;
  const total = Number(quote.quotedTotal) || 0;
  return { subtotal, taxRate, taxAmount, total };
}

function totalsFromTrips(trips) {
  if (!Array.isArray(trips) || trips.length === 0) {
    return { subtotal: 0, taxRate: 0, taxAmount: 0, total: 0 };
  }
  if (trips.length === 1) return totalsFromTrip(trips[0]);

  let subtotal = 0;
  let taxAmount = 0;
  let total = 0;
  for (const trip of trips) {
    const t = totalsFromTrip(trip);
    subtotal += t.subtotal;
    taxAmount += t.taxAmount;
    total += t.total;
  }
  return {
    subtotal,
    taxRate: Number(trips[0].quote?.quotedTaxRate) || 0,
    taxAmount,
    total,
  };
}

function invoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`;
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Deduplicates and trims trip id strings. */
function normalizeTripIdList(ids) {
  const out = [];
  const seen = new Set();
  for (const id of ids || []) {
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Loads trip docs for invoicing in one pass, enqueueing each trip's
 * `linkedTripID` companion when not already included.
 *
 * Throws if any requested id is missing so callers fail closed instead of
 * writing a half invoice.
 *
 * @returns {Promise<{ trips: object[], refs: FirebaseFirestore.DocumentReference[], tripIds: string[] }>}
 */
async function loadTripsForPaymentInvoice(db, seedTripIds, branchId = DEFAULT_BRANCH_ID) {
  const ids = normalizeTripIdList(seedTripIds);
  const trips = [];
  const refs = [];
  const seen = new Set(ids);

  for (let i = 0; i < ids.length; i++) {
    const { ref, snap } = await resolveTripRef(db, ids[i], branchId);
    if (!snap.exists) {
      throw new Error(`Missing trip ${ids[i]} (branch=${branchId})`);
    }
    const trip = { id: snap.id, ...snap.data() };
    trips.push(trip);
    refs.push(ref);

    const linked =
      typeof trip.journey?.linkedTripID === "string" ? trip.journey.linkedTripID.trim() : "";
    if (linked && !seen.has(linked)) {
      seen.add(linked);
      ids.push(linked);
    }
  }

  return { trips, refs, tripIds: ids };
}

function requireQuoteCurrency(trip) {
  const code = trip?.quote?.quotedCurrencyCode;
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("Quote is missing currency.");
  }
  return code.trim().toUpperCase();
}

/**
 * Creates a Firestore invoice aggregating line items and totals for every trip.
 *
 * @param {object[]} params.trips Non-empty array of trip docs (with `id`).
 */
async function createFirestoreInvoice(db, {
  trips,
  status,
  source,
  branchId = DEFAULT_BRANCH_ID,
  stripeFields = {},
}) {
  if (!Array.isArray(trips) || trips.length === 0) {
    throw new Error("createFirestoreInvoice requires a non-empty trips array.");
  }

  const primary = trips[0];
  const tripIDs = trips.map((t) => t.id).filter(Boolean);
  const lineItems = lineItemsFromTrips(trips);
  const totals = totalsFromTrips(trips);

  const now = admin.firestore.Timestamp.now();
  const dueAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  );

  // Pre-generate the document ref so the `id` field is written with the rest of
  // the payload in a single `set` instead of an `add` followed by an `update`.
  const ref = invoicesCollection(db, branchId).doc();

  const payload = {
    invoiceNumber: invoiceNumber(),
    customerID: primary.customerID,
    customerName: primary.customer?.displayName || "Customer",
    customerEmail: primary.customer?.email || null,
    customerPhone: primary.customer?.phoneNumber || null,
    tripIDs,
    branchId,
    status,
    currencyCode: requireQuoteCurrency(primary),
    lineItems,
    subtotal: totals.subtotal,
    taxRate: totals.taxRate,
    taxAmount: totals.taxAmount,
    total: totals.total,
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
  lineItemsFromTrips,
  createFirestoreInvoice,
  loadTripsForPaymentInvoice,
  normalizeTripIdList,
  transferLineLabel,
};
