"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";

import { getClientEnv } from "@/lib/env";

/**
 * Lazily-initialised Firebase client singletons.
 *
 * Initialisation is deferred until first use so that missing env vars surface
 * as a clear runtime error in the browser rather than breaking the build.
 */

let cachedApp: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp;
  const env = getClientEnv();
  cachedApp = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
        databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
      });
  return cachedApp;
}

let cachedAuth: Auth | null = null;
export function firebaseAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(firebaseApp());
  return cachedAuth;
}

let cachedDb: Firestore | null = null;
export function firestore(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(firebaseApp());
  return cachedDb;
}

let cachedRtdb: Database | null = null;
export function realtimeDb(): Database {
  if (!cachedRtdb) cachedRtdb = getDatabase(firebaseApp());
  return cachedRtdb;
}
