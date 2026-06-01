import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

import { getServerEnv } from "@/lib/env";

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

let cachedApp: App | null = null;
export function adminApp(): App {
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length
    ? getApp()
    : initializeApp({ credential: cert(decodeServiceAccount() as never) });
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
