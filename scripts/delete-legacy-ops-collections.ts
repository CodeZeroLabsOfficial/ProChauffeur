/**
 * Inventory (default) or delete legacy top-level ops collections after nested cutover.
 *
 * Dry-run (count only — safe):
 *   npx tsx --env-file=.env.local scripts/delete-legacy-ops-collections.ts
 *
 * Delete for real (irreversible):
 *   CONFIRM_DELETE_LEGACY=YES npx tsx --env-file=.env.local scripts/delete-legacy-ops-collections.ts
 *
 * Prerequisites: nested paths verified in production; app no longer reads legacy top-level ops.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { Collections } from "../lib/models";

const LEGACY_COLLECTIONS = [
  Collections.trips,
  Collections.vehicles,
  Collections.locations,
  Collections.vehicleClasses,
  Collections.invoices,
  Collections.notifications
] as const;

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

async function countDocs(firestore: Firestore, name: string): Promise<number> {
  const snap = await firestore.collection(name).count().get();
  return snap.data().count;
}

async function deleteCollection(firestore: Firestore, name: string): Promise<number> {
  const col = firestore.collection(name);
  let deleted = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await col.limit(400).get();
    if (snap.empty) break;
    const batch = firestore.batch();
    for (const doc of snap.docs) {
      batch.delete(doc.ref);
      deleted += 1;
    }
    await batch.commit();
  }
  return deleted;
}

async function main() {
  const confirm = process.env.CONFIRM_DELETE_LEGACY === "YES";
  const firestore = db();

  console.log(confirm ? "DELETE MODE — removing legacy top-level ops docs" : "DRY RUN — counts only");
  console.log("");

  for (const name of LEGACY_COLLECTIONS) {
    const count = await countDocs(firestore, name);
    if (!confirm) {
      console.log(`  ${name}: ${count} docs`);
      continue;
    }
    const deleted = await deleteCollection(firestore, name);
    console.log(`  ${name}: deleted ${deleted} docs`);
  }

  console.log("");
  if (!confirm) {
    console.log("Re-run with CONFIRM_DELETE_LEGACY=YES to delete. Do not delete settings under app_settings without a separate review.");
  } else {
    console.log("Done. Legacy top-level ops collections cleared (documents only).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
