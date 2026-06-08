import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getDatabase, type Database } from "firebase-admin/database";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { getServerEnv, getDatabaseUrl } from "@/lib/env";

/**
 * Firebase Admin SDK singletons for server-side use (route handlers, server
 * components, middleware-adjacent logic). The credential is a base64-encoded
 * service-account JSON stored in FIREBASE_SERVICE_ACCOUNT_KEY.
 */

function decodeServiceAccount(): Record<string, unknown> {
  const raw = getServerEnv().FIREBASE_SERVICE_ACCOUNT_KEY;
  const json = Buffer.from(raw, "base64").toString("utf8");
  try {
    return JSON.parse(json);
  } catch {
    // Fall back to a raw (non-base64) JSON string if that's what was provided.
    return JSON.parse(raw);
  }
}

function normalizeBucketName(bucket: string | undefined): string | undefined {
  if (!bucket) return undefined;
  return bucket.replace(/^gs:\/\//, "").replace(/\/+$/, "").trim();
}

let cachedApp: App | null = null;
export function adminApp(): App {
  if (cachedApp) return cachedApp;
  const serviceAccount = decodeServiceAccount();
  const storageBucket =
    normalizeBucketName(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) ||
    normalizeBucketName((serviceAccount.project_id as string | undefined)?.trim())
      ?.concat(".appspot.com");
  cachedApp = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert(serviceAccount as never),
        databaseURL: getDatabaseUrl(),
        ...(storageBucket ? { storageBucket } : {})
      });
  return cachedApp;
}

let cachedAuth: Auth | null = null;
export function adminAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(adminApp());
  return cachedAuth;
}

let cachedDb: Firestore | null = null;
export function adminFirestore(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(adminApp());
  return cachedDb;
}

let cachedRtdb: Database | null = null;
export function adminDatabase(): Database {
  if (!cachedRtdb) cachedRtdb = getDatabase(adminApp());
  return cachedRtdb;
}
