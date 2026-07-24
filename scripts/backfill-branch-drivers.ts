/**
 * Ensures every chauffeur has homeBranchId and a Location roster doc.
 *
 * For each users/{uid} with role === "driver":
 * - Sets homeBranchId to existing value or DEFAULT_BRANCH_ID
 * - Upserts branches/{homeBranchId}/drivers/{uid} from users.driverProfile
 *
 * Usage (from Web App root, with env loaded):
 *   npx tsx --env-file=.env.local scripts/backfill-branch-drivers.ts
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore";

import { Collections, DEFAULT_BRANCH_ID } from "../lib/models";

function decodeServiceAccount(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is required");
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return JSON.parse(raw);
  }
}

function db(): Firestore {
  if (!getApps().length) {
    initializeApp({ credential: cert(decodeServiceAccount() as Parameters<typeof cert>[0]) });
  }
  return getFirestore();
}

async function main() {
  const firestore = db();
  const usersSnap = await firestore.collection(Collections.users).get();
  const now = FieldValue.serverTimestamp();

  let updated = 0;
  let rostered = 0;
  let batch = firestore.batch();
  let ops = 0;

  async function flush() {
    if (ops === 0) return;
    await batch.commit();
    batch = firestore.batch();
    ops = 0;
  }

  for (const userSnap of usersSnap.docs) {
    const data = userSnap.data();
    if (data.role !== "driver") continue;

    const homeBranchId =
      typeof data.homeBranchId === "string" && data.homeBranchId.trim()
        ? data.homeBranchId.trim()
        : DEFAULT_BRANCH_ID;

    if (data.homeBranchId !== homeBranchId) {
      batch.update(userSnap.ref, { homeBranchId });
      ops += 1;
      updated += 1;
    }

    const profile = (data.driverProfile ?? data.driverStaff ?? {}) as Record<string, unknown>;
    const rosterRef = firestore
      .collection("branches")
      .doc(homeBranchId)
      .collection("drivers")
      .doc(userSnap.id);

    batch.set(
      rosterRef,
      {
        id: userSnap.id,
        userId: userSnap.id,
        ...profile,
        createdAt: data.createdAt ?? now,
        updatedAt: now
      },
      { merge: true }
    );
    ops += 1;
    rostered += 1;

    if (ops >= 400) await flush();
  }

  await flush();
  console.log(`Updated homeBranchId on ${updated} chauffeurs.`);
  console.log(`Upserted ${rostered} roster docs under branches/{id}/drivers.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
