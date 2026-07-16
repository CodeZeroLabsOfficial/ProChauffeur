/**
 * Deletes leftover company/locale (and optional operator pricing/hours) after
 * the app_settings + branch-settings cutover.
 *
 * Dry-run:
 *   npx tsx --env-file=.env.local scripts/cleanup-legacy-operator-settings.ts
 *
 * Delete:
 *   CONFIRM_DELETE_LEGACY_SETTINGS=YES npx tsx --env-file=.env.local scripts/cleanup-legacy-operator-settings.ts
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type DocumentReference, type Firestore } from "firebase-admin/firestore";

import { Collections, DEFAULT_BRANCH_ID, OperatorDocs } from "../lib/models";

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

type Target = { label: string; ref: DocumentReference };

async function listTargets(firestore: Firestore): Promise<Target[]> {
  const branchSettings = firestore
    .collection(Collections.branches)
    .doc(DEFAULT_BRANCH_ID)
    .collection("settings");

  return [
    {
      label: `operator/${OperatorDocs.company}`,
      ref: firestore.collection(Collections.operator).doc(OperatorDocs.company)
    },
    {
      label: `operator/${OperatorDocs.locale}`,
      ref: firestore.collection(Collections.operator).doc(OperatorDocs.locale)
    },
    {
      label: "operator/pricing",
      ref: firestore.collection(Collections.operator).doc("pricing")
    },
    {
      label: "operator/operating_hours",
      ref: firestore.collection(Collections.operator).doc("operating_hours")
    },
    {
      label: `branches/${DEFAULT_BRANCH_ID}/settings/company`,
      ref: branchSettings.doc("company")
    },
    {
      label: `branches/${DEFAULT_BRANCH_ID}/settings/locale`,
      ref: branchSettings.doc("locale")
    }
  ];
}

async function main() {
  const confirm = process.env.CONFIRM_DELETE_LEGACY_SETTINGS === "YES";
  const firestore = db();
  const targets = await listTargets(firestore);

  console.log(confirm ? "DELETE MODE" : "DRY RUN — existence only");
  console.log("");

  // Verify canonical docs exist before deleting sources.
  const company = await firestore.collection(Collections.appSettings).doc("company").get();
  const locale = await firestore.collection(Collections.appSettings).doc("locale").get();
  const pricing = await firestore
    .collection(Collections.branches)
    .doc(DEFAULT_BRANCH_ID)
    .collection("settings")
    .doc("pricing")
    .get();
  const hours = await firestore
    .collection(Collections.branches)
    .doc(DEFAULT_BRANCH_ID)
    .collection("settings")
    .doc("operating_hours")
    .get();

  console.log("Canonical (must exist to delete leftovers):");
  console.log(`  app_settings/company: ${company.exists ? "ok" : "MISSING"}`);
  console.log(`  app_settings/locale: ${locale.exists ? "ok" : "MISSING"}`);
  console.log(`  branches/${DEFAULT_BRANCH_ID}/settings/pricing: ${pricing.exists ? "ok" : "MISSING"}`);
  console.log(
    `  branches/${DEFAULT_BRANCH_ID}/settings/operating_hours: ${hours.exists ? "ok" : "MISSING"}`
  );
  console.log("");

  if (confirm && (!company.exists || !locale.exists)) {
    throw new Error("Refuse to delete: app_settings/company or locale missing.");
  }

  for (const { label, ref } of targets) {
    const snap = await ref.get();
    if (!snap.exists) {
      console.log(`  skip (absent): ${label}`);
      continue;
    }
    if (!confirm) {
      console.log(`  present: ${label}`);
      continue;
    }
    // Only delete operator pricing/hours if branch copies exist.
    if (label === "operator/pricing" && !pricing.exists) {
      console.log(`  skip (no branch pricing): ${label}`);
      continue;
    }
    if (label === "operator/operating_hours" && !hours.exists) {
      console.log(`  skip (no branch hours): ${label}`);
      continue;
    }
    await ref.delete();
    console.log(`  deleted: ${label}`);
  }

  console.log("");
  if (!confirm) {
    console.log("Re-run with CONFIRM_DELETE_LEGACY_SETTINGS=YES to delete.");
  } else {
    console.log("Done.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
