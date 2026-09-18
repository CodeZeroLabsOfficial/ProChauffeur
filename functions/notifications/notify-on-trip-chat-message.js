/**
 * RTDB trip chat message create → notify the other party.
 */

const admin = require("firebase-admin");
const { deliverUserNotification } = require("./deliver-user-notification");

function truncate(text, max = 120) {
  const t = String(text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function displayNameForUid(uid) {
  if (!uid) return null;
  const snap = await admin.firestore().collection("users").doc(uid).get();
  if (!snap.exists) return null;
  const profile = snap.data()?.profile || {};
  const name = profile.displayName || profile.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/**
 * @param {import("firebase-functions/v2/database").DatabaseEvent} event
 */
async function notifyOnTripChatMessageHandler(event) {
  const snap = event.data;
  const val = typeof snap?.val === "function" ? snap.val() : null;
  if (!val || typeof val !== "object") return;

  const { branchId, tripId } = event.params;
  const senderId = val.senderId;
  const senderRole = val.senderRole;
  const text = truncate(val.text);
  if (!senderId || !senderRole || !text) return;

  const threadSnap = await admin
    .database()
    .ref(`tripChats/${branchId}/${tripId}`)
    .once("value");
  const thread = threadSnap.val() || {};
  const customerId = thread.customerId;
  const driverId = thread.driverId;

  let recipients = [];
  let title = "Message from dispatch";
  let prefKey = "bookingReminders";

  if (senderRole === "customer") {
    if (driverId && driverId !== senderId) recipients = [driverId];
    const name = (await displayNameForUid(senderId)) || "Passenger";
    title = `Message from ${name}`;
    prefKey = "tripJobAlerts";
  } else if (senderRole === "driver") {
    if (customerId && customerId !== senderId) recipients = [customerId];
    const name = (await displayNameForUid(senderId)) || "Chauffeur";
    title = `Message from ${name}`;
    prefKey = "bookingReminders";
  } else if (senderRole === "staff") {
    const targets = [customerId, driverId].filter(
      (id) => id && id !== senderId
    );
    title = "Message from dispatch";
    await Promise.all(
      targets.map((uid) =>
        deliverUserNotification({
          uid,
          type: "chat.message",
          title,
          body: text,
          tripId,
          branchId,
          prefKey:
            uid === driverId ? "tripJobAlerts" : "bookingReminders",
        })
      )
    );
    return;
  }

  await Promise.all(
    recipients.map((uid) =>
      deliverUserNotification({
        uid,
        type: "chat.message",
        title,
        body: text,
        tripId,
        branchId,
        prefKey,
      })
    )
  );
}

module.exports = { notifyOnTripChatMessageHandler };
