/**
 * Vendor stamp CLI: seed plans/license and mint onboarding invites.
 *
 * Usage:
 *   node --env-file=.env.local scripts/stamp.mjs seed
 *   node --env-file=.env.local scripts/stamp.mjs invite [--host https://app.example.com] [--days 7]
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_KEY (base64 or raw JSON) and optionally
 * NEXT_PUBLIC_FIREBASE_DATABASE_URL for Admin init.
 */

const { createHash, randomBytes } = require("crypto");
const { readFileSync } = require("fs");
const { resolve } = require("path");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const ROOT = resolve(__dirname, "..");

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw?.trim()) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_KEY (base64 or JSON).");
  }
  try {
    const json = Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    return JSON.parse(raw);
  }
}

function initAdmin() {
  if (getApps().length) return getFirestore();
  const serviceAccount = loadServiceAccount();
  const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();
  initializeApp({
    credential: cert(serviceAccount),
    ...(databaseURL ? { databaseURL } : {})
  });
  return getFirestore();
}

function readStampJson(name) {
  return JSON.parse(readFileSync(resolve(ROOT, "lib/seed/stamp", name), "utf8"));
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function countAdmins(db) {
  const snap = await db.collection("users").where("role", "==", "admin").limit(1).get();
  return snap.size;
}

async function seed() {
  const db = initAdmin();
  if ((await countAdmins(db)) > 0) {
    throw new Error("Stamp already has an admin — refuse to re-seed plans/license.");
  }

  const plans = readStampJson("plans.json");
  const license = readStampJson("license.json");

  await db.collection("app_settings").doc("plans").set(plans, { merge: true });
  await db.collection("app_settings").doc("license").set(license, { merge: true });

  console.log("Seeded app_settings/plans and app_settings/license.");
  console.log(
    `  planId=${license.planId} maxLocations=${license.maxLocations} maxAdmins=${license.maxAdmins} maxDrivers=${license.maxDrivers}`
  );
}

async function invite(argv) {
  const db = initAdmin();
  if ((await countAdmins(db)) > 0) {
    throw new Error("Stamp already has an admin — refuse to mint invite.");
  }

  let host = process.env.STAMP_PUBLIC_HOST?.trim() || "http://localhost:3000";
  let days = 7;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--host" && argv[i + 1]) {
      host = argv[i + 1].replace(/\/+$/, "");
      i += 1;
    } else if (argv[i] === "--days" && argv[i + 1]) {
      days = Math.max(1, Number(argv[i + 1]) || 7);
      i += 1;
    }
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await db.collection("app_settings").doc("onboardingInvite").set({
    tokenHash: hashToken(token),
    status: "pending",
    boundUid: null,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    usedAt: null
  });

  const url = `${host.replace(/\/+$/, "")}/onboarding?token=${encodeURIComponent(token)}`;
  console.log("Onboarding invite minted (single-use).");
  console.log(`  Expires: ${expiresAt.toISOString()}`);
  console.log(`  URL: ${url}`);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "seed") {
    await seed();
    return;
  }
  if (cmd === "invite") {
    await invite(rest);
    return;
  }
  console.error("Usage: node scripts/stamp.mjs <seed|invite> [--host URL] [--days N]");
  process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
