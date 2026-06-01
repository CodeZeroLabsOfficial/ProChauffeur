import { z } from "zod";

/**
 * Centralised, fail-fast environment configuration.
 *
 * Client values (NEXT_PUBLIC_*) are inlined at build time and safe to expose.
 * Server-only secrets are read lazily so the browser bundle never references them.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default("en-AU"),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().default("AUD"),
  NEXT_PUBLIC_DEFAULT_TIMEZONE: z.string().default("Australia/Sydney"),
  NEXT_PUBLIC_FUNCTIONS_REGION: z.string().default("us-central1")
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
  NEXT_PUBLIC_DEFAULT_LOCALE: process.env.NEXT_PUBLIC_DEFAULT_LOCALE,
  NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
  NEXT_PUBLIC_DEFAULT_TIMEZONE: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE,
  NEXT_PUBLIC_FUNCTIONS_REGION: process.env.NEXT_PUBLIC_FUNCTIONS_REGION
};

let cachedClientEnv: z.infer<typeof clientSchema> | null = null;

/**
 * Returns the validated public client env, throwing a descriptive error that
 * lists every missing/invalid variable. Call only where the values are needed
 * (e.g. inside Firebase client init) so missing config never breaks the build.
 */
export function getClientEnv(): z.infer<typeof clientSchema> {
  if (cachedClientEnv) return cachedClientEnv;
  const parsed = clientSchema.safeParse(rawClientEnv);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Invalid or missing public environment variables: ${missing}. ` +
        `Add them to .env.local (see .env.example) or your Vercel project settings.`
    );
  }
  cachedClientEnv = parsed.data;
  return cachedClientEnv;
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

/** Public app defaults derived from env, with AU fallbacks. */
export const appConfig = {
  locale: rawClientEnv.NEXT_PUBLIC_DEFAULT_LOCALE ?? "en-AU",
  currency: rawClientEnv.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "AUD",
  timezone: rawClientEnv.NEXT_PUBLIC_DEFAULT_TIMEZONE ?? "Australia/Sydney",
  functionsRegion: rawClientEnv.NEXT_PUBLIC_FUNCTIONS_REGION ?? "us-central1"
} as const;
