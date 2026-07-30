/**
 * One-time migration: nest fleet vehicle details, capacity, and specifications.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT_KEY=... node scripts/migrate-vehicle-nested.mjs --dry-run
 *   FIREBASE_SERVICE_ACCOUNT_KEY=... node scripts/migrate-vehicle-nested.mjs
 *   FIREBASE_SERVICE_ACCOUNT_KEY=... node scripts/migrate-vehicle-nested.mjs --branch=sydney
 *
 * Service account may be base64-encoded JSON or raw JSON.
 * Migrates branches/{branchId}/vehicles/{vehicleId} only (not trip snapshots).
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const branchArg = [...args].find((a) => a.startsWith("--branch="));
const onlyBranch = branchArg ? branchArg.slice("--branch=".length) : null;

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_KEY to base64 or raw service-account JSON.");
  }
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return JSON.parse(raw);
  }
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

function asNullableString(value) {
  return typeof value === "string" ? value : null;
}

function asInt(value, fallback = 0) {
  const n = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

const FLAT_KEYS = [
  "make",
  "model",
  "color",
  "passengerCapacity",
  "manufactureYear",
  "vehicleIdentificationNumber",
  "engineTypeDescription",
  "vehicleClassId",
  "luggageDescription",
  "smallLuggageCount",
  "largeLuggageCount",
  "wifiServiceDescription",
  "serviceClassDescription",
  "interiorDescription",
  "climateControlDescription",
  "gearTypeDescription",
  "specificationChips",
  "carFeatureRows"
];

function hasFlatLeftovers(data) {
  return FLAT_KEYS.some((key) => Object.prototype.hasOwnProperty.call(data, key));
}

function isAlreadyNested(data) {
  return (
    data.details &&
    typeof data.details === "object" &&
    data.capacity &&
    typeof data.capacity === "object" &&
    data.specifications &&
    typeof data.specifications === "object" &&
    !hasFlatLeftovers(data)
  );
}

function buildNested(data) {
  const existingDetails = data.details && typeof data.details === "object" ? data.details : {};
  const existingCapacity = data.capacity && typeof data.capacity === "object" ? data.capacity : {};
  const existingLuggage =
    existingCapacity.luggage && typeof existingCapacity.luggage === "object"
      ? existingCapacity.luggage
      : {};
  const existingSpecs =
    data.specifications && typeof data.specifications === "object" ? data.specifications : {};

  const details = {
    make: asString(existingDetails.make ?? data.make),
    model: asString(existingDetails.model ?? data.model),
    color: asString(existingDetails.color ?? data.color),
    manufactureYear:
      existingDetails.manufactureYear != null
        ? asInt(existingDetails.manufactureYear, 0)
        : data.manufactureYear != null
          ? asInt(data.manufactureYear, 0)
          : null,
    vehicleIdentificationNumber: asNullableString(
      existingDetails.vehicleIdentificationNumber ?? data.vehicleIdentificationNumber
    ),
    vehicleClassId: asNullableString(existingDetails.vehicleClassId ?? data.vehicleClassId)
  };

  const capacity = {
    passengerCount: asInt(existingCapacity.passengerCount ?? data.passengerCapacity, 0),
    luggage: {
      smallCount: asInt(existingLuggage.smallCount ?? data.smallLuggageCount, 0),
      largeCount: asInt(existingLuggage.largeCount ?? data.largeLuggageCount, 0)
    }
  };

  const specifications = {
    engineType: asNullableString(existingSpecs.engineType ?? data.engineTypeDescription),
    transmission: asString(existingSpecs.transmission ?? data.gearTypeDescription),
    wifi: asString(existingSpecs.wifi ?? data.wifiServiceDescription) || "Complimentary",
    interior: asString(existingSpecs.interior ?? data.interiorDescription),
    climateControl: asString(existingSpecs.climateControl ?? data.climateControlDescription)
  };

  const deletes = {};
  for (const key of FLAT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      deletes[key] = FieldValue.delete();
    }
  }

  return {
    details,
    capacity,
    specifications,
    ...deletes
  };
}

async function main() {
  const serviceAccount = loadServiceAccount();
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  const db = getFirestore();

  console.log(dryRun ? "Dry run — no writes." : "Live run — writing nested vehicle docs.");
  if (onlyBranch) console.log(`Branch filter: ${onlyBranch}`);

  const branchesSnap = onlyBranch
    ? null
    : await db.collection("branches").select().get();
  const branchIds = onlyBranch
    ? [onlyBranch]
    : branchesSnap.docs.map((doc) => doc.id);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const branchId of branchIds) {
    const vehiclesSnap = await db.collection("branches").doc(branchId).collection("vehicles").get();
    for (const doc of vehiclesSnap.docs) {
      const data = doc.data() ?? {};
      const path = `branches/${branchId}/vehicles/${doc.id}`;
      try {
        if (isAlreadyNested(data)) {
          skipped += 1;
          console.log(`skip  ${path}`);
          continue;
        }
        const patch = buildNested(data);
        if (dryRun) {
          migrated += 1;
          console.log(`would ${path}`, JSON.stringify({ details: patch.details, capacity: patch.capacity, specifications: patch.specifications }));
          continue;
        }
        await doc.ref.update(patch);
        migrated += 1;
        console.log(`ok    ${path}`);
      } catch (error) {
        failed += 1;
        console.error(`fail  ${path}`, error instanceof Error ? error.message : error);
      }
    }
  }

  console.log(`Done. migrated=${migrated} skipped=${skipped} failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
