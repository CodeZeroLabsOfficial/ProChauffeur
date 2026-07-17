/**
 * Migrates `app_settings/branding` → `app_settings/workspace` and renames
 * `portalName` → `workspaceName`. Optionally copies Storage assets under
 * `branding/` to `workspace/` and rewrites logo/favicon URLs.
 *
 * Dry-run (default):
 *   npx tsx --env-file=.env.local scripts/migrate-branding-to-workspace.ts
 *   npm run migrate:workspace
 *
 * Write destination (keeps source):
 *   APPLY=YES npx tsx --env-file=.env.local scripts/migrate-branding-to-workspace.ts
 *
 * Write destination and delete source doc after success:
 *   APPLY=YES DELETE_SOURCE=YES npx tsx --env-file=.env.local scripts/migrate-branding-to-workspace.ts
 */

import { randomUUID } from "crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { AppSettingsDocs, Collections } from "../lib/models";

const LEGACY_DOC = "branding";

function decodeServiceAccount(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is required");
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return JSON.parse(raw);
  }
}

function normalizeBucketName(bucket: string | undefined): string | undefined {
  if (!bucket) return undefined;
  return bucket.replace(/^gs:\/\//, "").replace(/\/+$/, "").trim();
}

function initAdmin() {
  if (getApps().length) return;
  const sa = decodeServiceAccount();
  const projectId =
    typeof sa.project_id === "string" ? sa.project_id.trim() : undefined;
  const storageBucket =
    normalizeBucketName(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) ||
    (projectId ? `${projectId}.appspot.com` : undefined);
  initializeApp({
    credential: cert(sa as Parameters<typeof cert>[0]),
    ...(storageBucket ? { storageBucket } : {})
  });
}

function db(): Firestore {
  initAdmin();
  return getFirestore();
}

function storagePathFromDownloadUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const match = url.match(/\/o\/([^?]+)/);
    if (!match?.[1]) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

async function copyStorageObject(
  sourcePath: string,
  destPath: string
): Promise<string | null> {
  const bucket = getStorage().bucket();
  const source = bucket.file(sourcePath);
  const [exists] = await source.exists();
  if (!exists) {
    console.log(`  Storage skip (missing): ${sourcePath}`);
    return null;
  }

  const dest = bucket.file(destPath);
  await source.copy(dest);
  const token = randomUUID();
  await dest.setMetadata({
    metadata: {
      firebaseStorageDownloadTokens: token
    }
  });

  const encoded = encodeURIComponent(destPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encoded}?alt=media&token=${token}`;
}

function mapWorkspaceFields(data: Record<string, unknown>): Record<string, unknown> {
  const portalName = data.portalName;
  const existingWorkspaceName = data.workspaceName;
  const workspaceName =
    typeof existingWorkspaceName === "string" && existingWorkspaceName.trim()
      ? existingWorkspaceName.trim()
      : typeof portalName === "string" && portalName.trim()
        ? portalName.trim()
        : undefined;

  const next: Record<string, unknown> = { ...data };
  delete next.portalName;
  if (workspaceName) next.workspaceName = workspaceName;
  return next;
}

/** Rewrite every string field whose Storage URL points under branding/. */
async function rewriteBrandingUrls(
  data: Record<string, unknown>,
  dryRun: boolean
): Promise<Record<string, unknown>> {
  const next = { ...data };
  for (const [key, value] of Object.entries(data)) {
    if (typeof value !== "string" || !value.includes("/o/")) continue;
    const sourcePath = storagePathFromDownloadUrl(value);
    if (!sourcePath?.startsWith("branding/")) continue;
    const destPath = `workspace/${sourcePath.slice("branding/".length)}`;
    if (dryRun) {
      console.log(`  Would copy ${key}: ${sourcePath} → ${destPath}`);
      continue;
    }
    const url = await copyStorageObject(sourcePath, destPath);
    if (url) {
      next[key] = url;
      console.log(`  Copied ${key} → ${destPath}`);
    }
  }
  return next;
}

async function main() {
  const apply = process.env.APPLY === "YES";
  const deleteSource = process.env.DELETE_SOURCE === "YES";
  const firestore = db();

  const sourceRef = firestore.collection(Collections.appSettings).doc(LEGACY_DOC);
  const destRef = firestore.collection(Collections.appSettings).doc(AppSettingsDocs.appearance);

  const sourceSnap = await sourceRef.get();
  const destSnap = await destRef.get();

  console.log(apply ? "APPLY MODE" : "DRY RUN");
  console.log(`  Source app_settings/${LEGACY_DOC}: ${sourceSnap.exists ? "exists" : "missing"}`);
  console.log(
    `  Dest   app_settings/${AppSettingsDocs.appearance}: ${destSnap.exists ? "exists" : "missing"}`
  );

  if (!sourceSnap.exists && !destSnap.exists) {
    console.log("Nothing to migrate.");
    return;
  }

  const sourceData = (sourceSnap.exists ? sourceSnap.data() : {}) as Record<string, unknown>;
  const destData = (destSnap.exists ? destSnap.data() : {}) as Record<string, unknown>;

  // Prefer existing workspace doc fields; fill gaps from branding.
  let merged = mapWorkspaceFields({ ...sourceData, ...destData });

  console.log("");
  console.log("Mapped fields (pre-storage):", JSON.stringify(merged, null, 2));
  merged = await rewriteBrandingUrls(merged, !apply);

  if (!apply) {
    console.log("");
    console.log("Re-run with APPLY=YES to write app_settings/workspace.");
    if (sourceSnap.exists) {
      console.log("Optionally add DELETE_SOURCE=YES to remove app_settings/branding after write.");
    }
    return;
  }

  await destRef.set(merged, { merge: true });
  console.log(`Wrote app_settings/${AppSettingsDocs.appearance}`);

  if (deleteSource && sourceSnap.exists) {
    await sourceRef.delete();
    console.log(`Deleted app_settings/${LEGACY_DOC}`);
  } else if (sourceSnap.exists) {
    console.log(`Left app_settings/${LEGACY_DOC} in place (pass DELETE_SOURCE=YES to remove).`);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
