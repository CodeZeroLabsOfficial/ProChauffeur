import type { FirebaseOptions } from "firebase/app";

export const REQUIRED_FIREBASE_ENV_VARS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
] as const;

type EnvSource = Record<string, string | undefined>;

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getMissingFirebaseEnvVars(
  env: EnvSource = process.env
): string[] {
  return REQUIRED_FIREBASE_ENV_VARS.filter((name) => !env[name]);
}

export function isFirebaseConfigured(env: EnvSource = process.env): boolean {
  return getMissingFirebaseEnvVars(env).length === 0;
}

export function getFirebaseSetupError(env: EnvSource = process.env): string | null {
  const missing = getMissingFirebaseEnvVars(env);
  if (missing.length === 0) {
    return null;
  }

  return `Firebase is not configured. Add these environment variables in Vercel (Production), then redeploy if the error persists: ${missing.join(", ")}.`;
}

export function readFirebaseConfig(env: EnvSource = process.env): FirebaseOptions | null {
  if (!isFirebaseConfigured(env)) {
    return null;
  }

  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function getFirebaseConfig(): FirebaseOptions {
  const config = readFirebaseConfig();
  if (!config) {
    throw new Error(getFirebaseSetupError() ?? "Firebase is not configured.");
  }
  return config;
}

export function getMapboxToken(): string {
  return required(
    "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN",
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
  );
}
