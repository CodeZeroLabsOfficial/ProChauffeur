const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const {
  DEFAULT_BRANCH_ID,
  resolveInvoiceRef,
  resolveTripRef,
} = require("../lib/collections");
const { requireAuth, requireAdmin } = require("../lib/auth");

/**
 * Admin callable: mark a Firestore invoice paid and sync linked trips to paid.
 */
async function markInvoicePaidHandler(request) {
  const uid = await requireAuth(request);
  const db = admin.firestore();
  await requireAdmin(db, uid);

  const invoiceId = request.data?.invoiceId;
  if (typeof invoiceId !== "string" || !invoiceId.trim()) {
    throw new HttpsError("invalid-argument", "invoiceId is required.");
  }

  const branchId =
    typeof request.data?.branchId === "string" && request.data.branchId.trim()
      ? request.data.branchId.trim()
      : DEFAULT_BRANCH_ID;

  const { ref, snap } = await resolveInvoiceRef(db, invoiceId.trim(), branchId);
  if (!snap.exists) {
    throw new HttpsError("not-found", "Invoice not found.");
  }

  const invoice = snap.data() || {};
  if (invoice.status === "paid") {
    return { invoiceId: snap.id, alreadyPaid: true };
  }
  if (invoice.status === "void") {
    throw new HttpsError("failed-precondition", "Void invoices cannot be marked paid.");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const tripIds = Array.isArray(invoice.tripIDs)
    ? invoice.tripIDs.filter((id) => typeof id === "string" && id.trim())
    : [];

  const batch = db.batch();
  batch.update(ref, {
    status: "paid",
    paidAt: now,
    updatedAt: now,
  });

  for (const tripId of tripIds) {
    const { ref: tripRef } = await resolveTripRef(db, tripId, branchId);
    batch.update(tripRef, {
      paymentStatus: "paid",
      paymentSource: "web",
      paidAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  return { invoiceId: snap.id, tripCount: tripIds.length, alreadyPaid: false };
}

module.exports = { markInvoicePaidHandler };
