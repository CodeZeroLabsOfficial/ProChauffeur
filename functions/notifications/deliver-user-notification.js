/**
 * Writes a user inbox doc and sends FCM to that user's tokens.
 * Not an exported Cloud Function — used by trip/chat notifiers.
 *
 * Ops: enable Firestore TTL on collection group `inbox`, field `expireAt`
 * (90-day retention; set below on every create).
 */

const admin = require("firebase-admin");

const INBOX_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * @param {object} opts
 * @param {string} opts.uid
 * @param {string} opts.type
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} [opts.tripId]
 * @param {string} [opts.branchId]
 * @param {string} [opts.deepLink]
 * @param {string} [opts.prefKey] notificationPrefs key that must be true (default: allow)
 */
async function deliverUserNotification({
  uid,
  type,
  title,
  body,
  tripId,
  branchId,
  deepLink,
  prefKey,
}) {
  if (!uid || typeof uid !== "string") return;

  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;

  const user = userSnap.data() || {};
  const prefs = user.notificationPrefs || {};
  if (prefKey && prefs[prefKey] === false) return;

  const now = admin.firestore.Timestamp.now();
  const expireAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + INBOX_TTL_MS);

  const inboxPayload = {
    type,
    title,
    body,
    createdAt: now,
    expireAt,
    readAt: null,
  };
  if (tripId) inboxPayload.tripId = tripId;
  if (branchId) inboxPayload.branchId = branchId;
  if (deepLink) inboxPayload.deepLink = deepLink;

  await userRef.collection("inbox").add(inboxPayload);

  const tokensMap = user.fcmTokens || {};
  const tokens = Object.keys(tokensMap).filter(Boolean);
  if (tokens.length === 0) return;

  const data = {
    type: String(type),
  };
  if (tripId) data.tripId = String(tripId);
  if (branchId) data.branchId = String(branchId);
  if (deepLink) data.deepLink = String(deepLink);

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: {
      title: String(title),
      body: String(body),
    },
    data,
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  });

  const stale = [];
  response.responses.forEach((res, idx) => {
    if (!res.success) {
      const code = res.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-registration-token")
      ) {
        stale.push(tokens[idx]);
      }
    }
  });

  if (stale.length > 0) {
    const updates = {};
    for (const token of stale) {
      updates[`fcmTokens.${token}`] = admin.firestore.FieldValue.delete();
    }
    await userRef.update(updates);
  }
}

/**
 * FCM-only multicast (no inbox) for open-pool fan-out.
 * @param {string[]} uids
 * @param {object} payload
 */
async function multicastOpenJobPush(uids, { type, title, body, tripId, branchId }) {
  const db = admin.firestore();
  const tokens = [];
  const tokenOwners = [];

  await Promise.all(
    uids.map(async (uid) => {
      const snap = await db.collection("users").doc(uid).get();
      if (!snap.exists) return;
      const data = snap.data() || {};
      if (data.notificationPrefs?.tripJobAlerts === false) return;
      const map = data.fcmTokens || {};
      for (const token of Object.keys(map)) {
        if (!token) continue;
        tokens.push(token);
        tokenOwners.push({ uid, token });
      }
    })
  );

  if (tokens.length === 0) return;

  const data = {
    type: String(type),
    tripId: String(tripId || ""),
    branchId: String(branchId || ""),
  };

  // FCM multicast max 500 tokens per call
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: { title: String(title), body: String(body) },
      data,
      apns: { payload: { aps: { sound: "default" } } },
    });
  }
}

module.exports = {
  deliverUserNotification,
  multicastOpenJobPush,
  INBOX_TTL_MS,
};
