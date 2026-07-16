/**
 * Migrates company + locale into `app_settings/{company|locale}`.
 *
 * Preference order per doc:
 *   1. Existing `app_settings/{docId}` (keep, no overwrite)
 *   2. `operator/{docId}`
 *   3. `branches/brisbane/settings/{docId}`
 *
 * Usage (from Web App root, with env loaded):
 *   npx tsx --env-file=.env.local scripts/migrate-company-locale-to-app-settings.ts
 *   npm run migrate:company-locale
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import {
  AppSettingsDocs,
  Collections,
  DEFAULT_BRANCH_ID,
  OperatorDocs
} from "../lib/models";

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

const MIGRATIONS = [
  { dest: AppSettingsDocs.company, operator: OperatorDocs.company },
  { dest: AppSettingsDocs.locale, operator: OperatorDocs.locale }
] as const;

async function migrateDoc(
  firestore: Firestore,
  dest: string,
  operatorDocId: string
): Promise<void> {
  const destRef = firestore.collection(Collections.appSettings).doc(dest);
  const existing = await destRef.get();
  if (existing.exists) {
    console.log(`Keep existing app_settings/${dest}`);
    return;
  }

  const operatorSnap = await firestore.collection(Collections.operator).doc(operatorDocId).get();
  if (operatorSnap.exists) {
    await destRef.set(operatorSnap.data()!, { merge: true });
    console.log(`Copied operator/${operatorDocId} → app_settings/${dest}`);
    return;
  }

  const branchSnap = await firestore
    .collection(Collections.branches)
    .doc(DEFAULT_BRANCH_ID)
    .collection("settings")
    .doc(dest)
    .get();
  if (branchSnap.exists) {
    await destRef.set(branchSnap.data()!, { merge: true });
    console.log(
      `Copied branches/${DEFAULT_BRANCH_ID}/settings/${dest} → app_settings/${dest}`
    );
    return;
  }

  console.log(
    `Skip app_settings/${dest} (no source in operator/${operatorDocId} or branches/${DEFAULT_BRANCH_ID}/settings/${dest})`
  );
}

async function main() {
  const firestore = db();

  for (const { dest, operator } of MIGRATIONS) {
    await migrateDoc(firestore, dest, operator);
  }

  console.log("Done. Company and locale live under app_settings.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
