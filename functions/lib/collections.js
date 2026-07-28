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

/** Default branch for booking writes until multi-city resolve ships. */
const DEFAULT_BRANCH_ID = "brisbane";

/** `branches/{branchId}/{subcollection}/{docId}` */
function branchDocPath(branchId, subcollection, docId) {
  return `${Collections.branches}/${branchId}/${subcollection}/${docId}`;
}

function tripDocPath(tripId, branchId = DEFAULT_BRANCH_ID) {
  return branchDocPath(branchId, Collections.trips, tripId);
}

function invoiceDocPath(invoiceId, branchId = DEFAULT_BRANCH_ID) {
  return branchDocPath(branchId, Collections.invoices, invoiceId);
}

/** Nested trip reference (new writes). */
function tripRef(db, tripId, branchId = DEFAULT_BRANCH_ID) {
  return db.doc(tripDocPath(tripId, branchId));
}

/** Nested invoice reference (new writes). */
function invoiceRef(db, invoiceId, branchId = DEFAULT_BRANCH_ID) {
  return db.doc(invoiceDocPath(invoiceId, branchId));
}

/** Nested invoices collection (auto-id creates). */
function invoicesCollection(db, branchId = DEFAULT_BRANCH_ID) {
  return db.collection(`${Collections.branches}/${branchId}/${Collections.invoices}`);
}

/**
 * Nested trip doc under `branches/{branchId}/trips/{tripId}`.
 * @returns {Promise<{ ref: FirebaseFirestore.DocumentReference, snap: FirebaseFirestore.DocumentSnapshot }>}
 */
async function resolveTripRef(db, tripId, branchId = DEFAULT_BRANCH_ID) {
  const ref = tripRef(db, tripId, branchId);
  const snap = await ref.get();
  return { ref, snap };
}

/**
 * Nested invoice doc under `branches/{branchId}/invoices/{invoiceId}`.
 */
async function resolveInvoiceRef(db, invoiceId, branchId = DEFAULT_BRANCH_ID) {
  const ref = invoiceRef(db, invoiceId, branchId);
  const snap = await ref.get();
  return { ref, snap };
}

module.exports = {
  Collections,
  PaymentMethodSubcollection,
  DEFAULT_BRANCH_ID,
  branchDocPath,
  tripDocPath,
  invoiceDocPath,
  tripRef,
  invoiceRef,
  invoicesCollection,
  resolveTripRef,
  resolveInvoiceRef,
};
