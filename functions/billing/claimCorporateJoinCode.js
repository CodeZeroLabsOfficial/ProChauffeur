const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const { Collections } = require("../lib/collections");
const { requireAuth } = require("../lib/auth");
const { assertCorporateAccountsEnabled } = require("../lib/license");

function normalizeCorporateJoinCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/**
 * Callable: links the signed-in user to an active corporate account via join code.
 * data: { joinCode: string }
 */
async function claimCorporateJoinCodeHandler(request) {
  const uid = await requireAuth(request);
  await assertCorporateAccountsEnabled(admin.firestore());

  const joinCode = normalizeCorporateJoinCode(request.data?.joinCode);
  if (!joinCode) {
    throw new HttpsError("invalid-argument", "joinCode is required.");
  }

  const db = admin.firestore();
  const snap = await db
    .collection(Collections.corporateAccounts)
    .where("joinCode", "==", joinCode)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError("not-found", "Invalid or inactive join code.");
  }

  const doc = snap.docs[0];
  const account = doc.data() || {};
  const corporateAccountId = doc.id;
  const name = typeof account.name === "string" ? account.name : "";

  await db.doc(`${Collections.users}/${uid}`).set(
    {
      corporateAccountId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true, corporateAccountId, name };
}

module.exports = {
  claimCorporateJoinCodeHandler,
  normalizeCorporateJoinCode,
};
