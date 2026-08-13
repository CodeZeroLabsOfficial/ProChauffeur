/** Firestore collection names and branch path helpers (mirror iOS / web). */

const Collections = {
  users: "users",
  trips: "trips",
  invoices: "invoices",
  paymentEvents: "payment_events",
  branches: "branches",
  corporateAccounts: "corporateAccounts",
};

const PaymentMethodSubcollection = "payment_methods";

/** Rejects empty Location ids. Writes must not fall back to a default city. */
function requireBranchId(branchId) {
  if (typeof branchId !== "string" || !branchId.trim()) {
    throw new Error("branchId is required.");
  }
  return branchId.trim();
}

/** `branches/{branchId}/{subcollection}/{docId}` */
function branchDocPath(branchId, subcollection, docId) {
  return `${Collections.branches}/${requireBranchId(branchId)}/${subcollection}/${docId}`;
}

function tripDocPath(tripId, branchId) {
  return branchDocPath(branchId, Collections.trips, tripId);
}

function invoiceDocPath(invoiceId, branchId) {
  return branchDocPath(branchId, Collections.invoices, invoiceId);
}

/** Nested trip reference. */
function tripRef(db, tripId, branchId) {
  return db.doc(tripDocPath(tripId, branchId));
}

/** Nested invoice reference. */
function invoiceRef(db, invoiceId, branchId) {
  return db.doc(invoiceDocPath(invoiceId, branchId));
}

/** Nested invoices collection (auto-id creates). */
function invoicesCollection(db, branchId) {
  return db.collection(
    `${Collections.branches}/${requireBranchId(branchId)}/${Collections.invoices}`
  );
}

/**
 * Nested trip doc under `branches/{branchId}/trips/{tripId}`.
 * @returns {Promise<{ ref: FirebaseFirestore.DocumentReference, snap: FirebaseFirestore.DocumentSnapshot }>}
 */
async function resolveTripRef(db, tripId, branchId) {
  const ref = tripRef(db, tripId, branchId);
  const snap = await ref.get();
  return { ref, snap };
}

/**
 * Nested invoice doc under `branches/{branchId}/invoices/{invoiceId}`.
 */
async function resolveInvoiceRef(db, invoiceId, branchId) {
  const ref = invoiceRef(db, invoiceId, branchId);
  const snap = await ref.get();
  return { ref, snap };
}

module.exports = {
  Collections,
  PaymentMethodSubcollection,
  requireBranchId,
  branchDocPath,
  tripDocPath,
  invoiceDocPath,
  tripRef,
  invoiceRef,
  invoicesCollection,
  resolveTripRef,
  resolveInvoiceRef,
};
