const admin = require("firebase-admin");
const { rtdbLiveTripPath, rtdbTripChatPath } = require("../lib/rtdb-paths");

const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);

/**
 * Drops live GPS and trip chat when a trip becomes completed or cancelled.
 * @param {import("firebase-functions/v2/firestore").FirestoreEvent} event
 */
async function clearTripEphemeralHandler(event) {
  const after = event.data?.after;
  if (!after?.exists) return;

  const status = after.get("status");
  if (!TERMINAL_STATUSES.has(status)) return;

  const beforeStatus = event.data?.before?.get?.("status");
  if (TERMINAL_STATUSES.has(beforeStatus) && beforeStatus === status) return;

  const branchId = event.params.branchId;
  const tripId = event.params.tripId;
  const db = admin.database();

  await Promise.all([
    db.ref(rtdbLiveTripPath(branchId, tripId)).remove(),
    db.ref(rtdbTripChatPath(branchId, tripId)).remove(),
  ]);
}

module.exports = { clearTripEphemeralHandler, TERMINAL_STATUSES };
