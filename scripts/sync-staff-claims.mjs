/**
 * Set Auth custom claims on every `role == admin` user so RTDB trip chat
 * rules can authorize Location staff.
 *
 * Usage:
 *   node --env-file=.env.local scripts/sync-staff-claims.mjs
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw?.trim()) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_KEY (base64 or JSON).");
  }
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return JSON.parse(raw);
  }
}

function initAdmin() {
  if (getApps().length) {
    return { auth: getAuth(), db: getFirestore() };
  }
  const serviceAccount = loadServiceAccount();
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();
  initializeApp({
    credential: cert(serviceAccount),
    ...(databaseURL ? { databaseURL } : {})
  });
  return { auth: getAuth(), db: getFirestore() };
}

function staffAuthClaims(input) {
  const claims = {
    role: "admin",
    staffRole: input.staffRole,
    canAccessAllBranches: input.canAccessAllBranches
  };
  if (!input.canAccessAllBranches) {
    const branches = {};
    for (const id of input.branchIds ?? []) {
      const key = typeof id === "string" ? id.trim() : "";
      if (key) branches[key] = true;
    }
    claims.branches = branches;
  }
  return claims;
}

function parseStaffRole(value) {
  if (value === "admin" || value === "manager" || value === "dispatcher" || value === "accounts") {
    return value;
  }
  return null;
}

const { auth, db } = initAdmin();
const snap = await db.collection("users").where("role", "==", "admin").get();
let updated = 0;
for (const doc of snap.docs) {
  const data = doc.data() ?? {};
  const staffRole = parseStaffRole(data.staffRole) ?? "admin";
  const canAccessAllBranches = data.canAccessAllBranches === true;
  const branchIds = Array.isArray(data.branchIds)
    ? data.branchIds.filter((id) => typeof id === "string" && id.trim())
    : null;
  await auth.setCustomUserClaims(
    doc.id,
    staffAuthClaims({
      staffRole,
      canAccessAllBranches,
      branchIds: canAccessAllBranches ? null : branchIds
    })
  );
  updated += 1;
  console.log(`claims ${doc.id} staffRole=${staffRole} allLocations=${canAccessAllBranches}`);
}
console.log(`Updated ${updated} staff user(s). Sign in again or wait for token refresh.`);
