import { getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFirebaseSetupError, readFirebaseConfig } from "./config";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let resolvedConfig: FirebaseOptions | null = null;
let initPromise: Promise<void> | null = null;

function applyFirebaseConfig(config: FirebaseOptions) {
  resolvedConfig = config;

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

export function getFirebaseConfig(): FirebaseOptions {
  if (resolvedConfig) {
    return resolvedConfig;
  }

  const fromEnv = readFirebaseConfig();
  if (fromEnv) {
    resolvedConfig = fromEnv;
    return fromEnv;
  }

  throw new Error(getFirebaseSetupError() ?? "Firebase is not configured.");
}

export function ensureFirebaseInitialized(): Promise<void> {
  if (app && auth && db && resolvedConfig) {
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
      config?: FirebaseOptions;
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
    const config = getFirebaseConfig();
    app = getApps()[0] ?? initializeApp(config);
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

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    const config = getFirebaseConfig();
    const firebaseApp = getFirebaseApp();
    storage =
      config.storageBucket != null && config.storageBucket.length > 0
        ? getStorage(firebaseApp, `gs://${config.storageBucket}`)
        : getStorage(firebaseApp);
  }
  return storage;
}
