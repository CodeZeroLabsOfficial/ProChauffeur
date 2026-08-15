import { z } from "zod";

/**
 * Centralised, fail-fast environment configuration.
 *
 * Client values (NEXT_PUBLIC_*) are inlined at build time and safe to expose.
 * Server-only secrets are read lazily so the browser bundle never references them.
 */

const firebaseClientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_FUNCTIONS_REGION: z.string().min(1)
});

export type FirebaseClientEnv = z.infer<typeof firebaseClientSchema>;

const mapboxSchema = z.object({
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1)
});

// Reference each var explicitly so Next.js can statically inline them.
const rawClientEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
  NEXT_PUBLIC_FUNCTIONS_REGION: process.env.NEXT_PUBLIC_FUNCTIONS_REGION
};

let cachedFirebaseEnv: FirebaseClientEnv | null = null;

/** Firebase client config required for Auth, Firestore and login. */
export function getFirebaseClientEnv(): FirebaseClientEnv {
  if (cachedFirebaseEnv) return cachedFirebaseEnv;
  const parsed = firebaseClientSchema.safeParse(rawClientEnv);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Invalid or missing Firebase environment variables: ${missing}. ` +
        `Add them in Vercel → Settings → Environment Variables, then redeploy.`
    );
  }
  cachedFirebaseEnv = parsed.data;
  return cachedFirebaseEnv;
}

/** RTDB URL — required only for Dispatch live locations. */
export function getDatabaseUrl(): string {
  const url = rawClientEnv.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_FIREBASE_DATABASE_URL. Add your Realtime Database URL in Vercel, then redeploy."
    );
  }
  return url;
}

/** Mapbox token — required only for the Dispatch map. */
export function getMapboxToken(): string {
  const parsed = mapboxSchema.safeParse({
    NEXT_PUBLIC_MAPBOX_TOKEN: rawClientEnv.NEXT_PUBLIC_MAPBOX_TOKEN
  });
  if (!parsed.success) {
    throw new Error(
      "Missing NEXT_PUBLIC_MAPBOX_TOKEN. Add it in Vercel → Environment Variables, then redeploy."
    );
  }
  return parsed.data.NEXT_PUBLIC_MAPBOX_TOKEN;
}

const serverSchema = z.object({
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().min(1)
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

/** Returns validated server-only secrets. Never import this from client code. */
export function getServerEnv(): z.infer<typeof serverSchema> {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse({
    FIREBASE_SERVICE_ACCOUNT_KEY: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  });
  if (!parsed.success) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_KEY (base64-encoded service-account JSON)."
    );
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Cloud Functions region for this stamp. Missing values fail in `getFirebaseClientEnv`. */
export const appConfig = {
  get functionsRegion() {
    return getFirebaseClientEnv().NEXT_PUBLIC_FUNCTIONS_REGION;
  }
};
