/**
 * One-shot: copy app_settings/locale onto every branches/{id}/settings/locale,
 * then delete the company locale doc.
 *
 * Usage (from repo root, with .env.local or FIREBASE_SERVICE_ACCOUNT_KEY set):
 *   node scripts/migrate-locale-to-branches.mjs
 */
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadEnvLocal() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq);
      let value = trimmed.slice(eq + 1);
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  } catch {
    // Rely on the process environment when .env.local is absent.
  }
}

function decodeServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is required.");
  }
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return JSON.parse(raw);
  }
}

loadEnvLocal();

if (!getApps().length) {
  initializeApp({ credential: cert(decodeServiceAccount()) });
}

const db = getFirestore();
const required = [
  "locale",
  "currency",
  "timezone",
  "distanceUnit",
  "defaultTaxRate",
  "taxName",
  "taxDisplayMode",
  "showTaxOnQuotes",
  "driverLicenceCountry"
];

const source = await db.doc("app_settings/locale").get();
if (!source.exists) {
  console.log("app_settings/locale is already gone. Nothing to migrate.");
  process.exit(0);
}

const data = { ...(source.data() || {}) };
if (data.driverLicenceCountry == null || data.driverLicenceCountry === "") {
  // Old company locale omitted this field; the previous parser treated it as AU.
  data.driverLicenceCountry = "au";
  console.log("Filled missing driverLicenceCountry with au (previous implied default).");
}
for (const field of required) {
  if (data[field] == null || data[field] === "") {
    throw new Error(`app_settings/locale is missing required field "${field}".`);
  }
}

const branches = await db.collection("branches").get();
if (branches.empty) {
  throw new Error("No branch documents found.");
}

for (const branch of branches.docs) {
  const dest = db.doc(`branches/${branch.id}/settings/locale`);
  await dest.set(data, { merge: true });
  console.log(`Wrote branches/${branch.id}/settings/locale`);
}

await source.ref.delete();
console.log("Deleted app_settings/locale");
