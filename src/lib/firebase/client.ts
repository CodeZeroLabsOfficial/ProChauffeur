import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getFirebaseConfig, readFirebaseConfig } from "./config";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let initPromise: Promise<void> | null = null;

function applyFirebaseConfig(config: ReturnType<typeof readFirebaseConfig>) {
  if (!config) {
    throw new Error("Firebase is not configured.");
  }

  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
  }
  if (!auth) {
    auth = getAuth(app);
  }
  if (!db) {
    db = getFirestore(app);
  }
}

export function ensureFirebaseInitialized(): Promise<void> {
  if (app && auth && db) {
    return Promise.resolve();
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const buildTimeConfig = readFirebaseConfig();
    if (buildTimeConfig) {
      applyFirebaseConfig(buildTimeConfig);
      return;
    }

    const response = await fetch("/api/firebase-config");
    const payload = (await response.json()) as {
      config?: ReturnType<typeof readFirebaseConfig>;
      error?: string;
    };

    if (!response.ok || !payload.config) {
      throw new Error(
        payload.error ??
          "Could not load Firebase configuration. Check Vercel environment variables."
      );
    }

    applyFirebaseConfig(payload.config);
  })();

  return initPromise;
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps()[0] ?? initializeApp(getFirebaseConfig());
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}
