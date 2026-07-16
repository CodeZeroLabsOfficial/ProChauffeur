/**
 * Idempotent copy of legacy top-level ops data into branches/brisbane/…
 *
 * Usage (from Web App root, with env loaded):
 *   npx tsx --env-file=.env.local scripts/backfill-brisbane-branch.ts
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type CollectionReference, type Firestore } from "firebase-admin/firestore";

import {
  BranchSettingsDocs,
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

async function copyCollection(
  firestore: Firestore,
  sourcePath: string,
  destCol: CollectionReference
): Promise<number> {
  const snap = await firestore.collection(sourcePath).get();
  let n = 0;
  let batch = firestore.batch();
  let ops = 0;

  for (const docSnap of snap.docs) {
    batch.set(destCol.doc(docSnap.id), docSnap.data(), { merge: true });
    n += 1;
    ops += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = firestore.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return n;
}

async function main() {
  const firestore = db();
  const branchId = DEFAULT_BRANCH_ID;
  const branchRef = firestore.collection(Collections.branches).doc(branchId);
  const now = new Date();

  await branchRef.set(
    {
      id: branchId,
      name: "Brisbane",
      isActive: true,
      timeZoneIdentifier: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ?? "Australia/Brisbane",
      serviceArea: null,
      createdAt: now,
      updatedAt: now
    },
    { merge: true }
  );
  console.log(`Upserted branches/${branchId}`);

  const globalSettings = [OperatorDocs.company, OperatorDocs.locale] as const;

  for (const docId of globalSettings) {
    const source = await firestore.collection(Collections.operator).doc(docId).get();
    if (!source.exists) {
      console.log(`Skip app_settings/${docId} (no operator/${docId})`);
      continue;
    }
    await firestore.collection(Collections.appSettings).doc(docId).set(source.data()!, { merge: true });
    console.log(`Copied operator/${docId} → app_settings/${docId}`);
  }

  for (const docId of Object.values(BranchSettingsDocs)) {
    const source = await firestore.collection(Collections.operator).doc(docId).get();
    if (!source.exists) {
      console.log(`Skip settings/${docId} (no operator/${docId})`);
      continue;
    }
    await branchRef.collection("settings").doc(docId).set(source.data()!, { merge: true });
    console.log(`Copied operator/${docId} → branches/${branchId}/settings/${docId}`);
  }

  const copies: [string, string][] = [
    [Collections.trips, "trips"],
    [Collections.vehicles, "vehicles"],
    [Collections.locations, "locations"],
    [Collections.vehicleClasses, "vehicle_classes"],
    [Collections.invoices, "invoices"]
  ];

  for (const [source, dest] of copies) {
    const count = await copyCollection(firestore, source, branchRef.collection(dest));
    console.log(`Copied ${count} docs → branches/${branchId}/${dest}`);
  }

  const usersSnap = await firestore.collection(Collections.users).get();
  let drivers = 0;
  let admins = 0;
  let batch = firestore.batch();
  let ops = 0;

  for (const userSnap of usersSnap.docs) {
    const data = userSnap.data();
    const role = data.role as string | undefined;
    const updates: Record<string, unknown> = {};

    if (role === "driver") {
      updates.homeBranchId = branchId;
      const profile = (data.driverProfile ?? data.driverStaff ?? {}) as Record<string, unknown>;
      batch.set(
        branchRef.collection("drivers").doc(userSnap.id),
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
      drivers += 1;
    }

    if (role === "admin") {
      updates.branchIds = [branchId];
      updates.defaultBranchId = branchId;
      updates.canAccessAllBranches = true;
      admins += 1;
    }

    if (Object.keys(updates).length > 0) {
      batch.set(userSnap.ref, updates, { merge: true });
      ops += 1;
    }

    if (ops >= 400) {
      await batch.commit();
      batch = firestore.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();

  console.log(`Updated ${drivers} drivers and ${admins} admins for branch ${branchId}`);
  console.log("Done. Ops data is nested under branches/{branchId}/ only — no dual-read runtime mode.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
