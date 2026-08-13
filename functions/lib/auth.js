const { HttpsError } = require("firebase-functions/v2/https");
const { Collections } = require("./collections");

async function getUserRole(db, uid) {
  const snap = await db.doc(`${Collections.users}/${uid}`).get();
  if (!snap.exists) return null;
  return snap.get("role");
}

async function requireAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  return request.auth.uid;
}

async function requireAdmin(db, uid) {
  const role = await getUserRole(db, uid);
  if (role !== "admin") {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

async function requireCustomer(db, uid) {
  const role = await getUserRole(db, uid);
  if (role !== "customer") {
    throw new HttpsError("permission-denied", "Customer access required.");
  }
}

function requireBranchIdArg(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError("invalid-argument", "branchId is required.");
  }
  return value.trim();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireCustomer,
  requireBranchIdArg,
};
