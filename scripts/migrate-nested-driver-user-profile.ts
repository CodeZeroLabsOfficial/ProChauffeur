/**
 * One-shot Admin SDK backfill: nest roster licence/accreditation/visibility,
 * nest users.profile.address, and migrate embedded users.driverProfile|driverStaff
 * onto branches/{homeBranchId|brisbane}/drivers/{uid}.
 *
 * Run before deploying nested-only Web + iOS builds:
 *   FIREBASE_SERVICE_ACCOUNT_KEY=... npx tsx scripts/migrate-nested-driver-user-profile.ts
 *
 * Exit code 1 when any document fails.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, type DocumentData, type Firestore } from "firebase-admin/firestore";

const DEFAULT_BRANCH_ID = "brisbane";

const FLAT_ROSTER_DELETE_KEYS = [
  "preferredGarageLocationId",
  "driversLicenseSummary",
  "driversLicenseNumber",
  "driversLicenseClassOrType",
  "driversLicenseConditions",
  "driversLicenseConditionCodes",
  "driversLicenseJurisdictionCode",
  "driversLicenseExpiry",
  "operatorAccreditationNumber",
  "operatorAccreditationIssuingAuthority",
  "operatorAccreditationExpiry",
  "visibleOnCustomerApp",
  "acceptsDispatchAssignments"
] as const;

const FLAT_ADDRESS_KEYS = ["street", "city", "state", "postcode", "country"] as const;

type Counts = { converted: number; skipped: number; errors: number };

function decodeServiceAccount(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_KEY (base64 or raw JSON service account).");
  }
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return JSON.parse(raw);
  }
}

function initDb(): Firestore {
  if (!getApps().length) {
    initializeApp({ credential: cert(decodeServiceAccount() as never) });
  }
  return getFirestore();
}

function hasOwn(obj: DocumentData, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function buildDriversLicense(d: DocumentData): DocumentData | null {
  if (d.driversLicense && typeof d.driversLicense === "object") {
    return d.driversLicense as DocumentData;
  }
  const nested = {
    summary: stringOrNull(d.driversLicenseSummary),
    number: stringOrNull(d.driversLicenseNumber),
    classOrType: stringOrNull(d.driversLicenseClassOrType),
    conditions: stringOrNull(d.driversLicenseConditions),
    conditionCodes: stringOrNull(d.driversLicenseConditionCodes),
    jurisdictionCode: stringOrNull(d.driversLicenseJurisdictionCode),
    expiry: d.driversLicenseExpiry ?? null
  };
  const has =
    nested.summary ||
    nested.number ||
    nested.classOrType ||
    nested.conditions ||
    nested.conditionCodes ||
    nested.jurisdictionCode ||
    nested.expiry != null;
  return has ? nested : null;
}

function buildOperatorAccreditation(d: DocumentData): DocumentData | null {
  if (d.operatorAccreditation && typeof d.operatorAccreditation === "object") {
    return d.operatorAccreditation as DocumentData;
  }
  const nested = {
    number: stringOrNull(d.operatorAccreditationNumber),
    issuingAuthority: stringOrNull(d.operatorAccreditationIssuingAuthority),
    expiry: d.operatorAccreditationExpiry ?? null
  };
  const has = nested.number || nested.issuingAuthority || nested.expiry != null;
  return has ? nested : null;
}

function buildVisibility(d: DocumentData): DocumentData {
  if (d.visibility && typeof d.visibility === "object") {
    const v = d.visibility as DocumentData;
    return {
      visibleOnCustomerApp: v.visibleOnCustomerApp !== false,
      acceptsDispatchAssignments: v.acceptsDispatchAssignments !== false
    };
  }
  return {
    visibleOnCustomerApp: d.visibleOnCustomerApp !== false,
    acceptsDispatchAssignments: d.acceptsDispatchAssignments !== false
  };
}

function needsRosterNesting(d: DocumentData): boolean {
  if (hasOwn(d, "preferredGarageLocationId")) return true;
  for (const key of FLAT_ROSTER_DELETE_KEYS) {
    if (key === "preferredGarageLocationId") continue;
    if (hasOwn(d, key)) return true;
  }
  if (!d.visibility || typeof d.visibility !== "object") return true;
  if (
    (hasOwn(d, "driversLicenseSummary") ||
      hasOwn(d, "driversLicenseNumber") ||
      hasOwn(d, "driversLicenseClassOrType") ||
      hasOwn(d, "driversLicenseConditions") ||
      hasOwn(d, "driversLicenseConditionCodes") ||
      hasOwn(d, "driversLicenseJurisdictionCode") ||
      hasOwn(d, "driversLicenseExpiry")) &&
    (!d.driversLicense || typeof d.driversLicense !== "object")
  ) {
    return true;
  }
  return false;
}

function nestedDriverProfileFromEmbedded(raw: DocumentData): DocumentData {
  const preferredOffice =
    stringOrNull(raw.preferredOfficeLocationId) ?? stringOrNull(raw.preferredGarageLocationId);
  return {
    chauffeurCategory: raw.chauffeurCategory ?? "chauffeur",
    qualifications: Array.isArray(raw.qualifications) ? raw.qualifications : [],
    bioStatement: typeof raw.bioStatement === "string" ? raw.bioStatement : "",
    serviceSpecialties: Array.isArray(raw.serviceSpecialties) ? raw.serviceSpecialties : [],
    vehicleOrServiceFocus: Array.isArray(raw.vehicleOrServiceFocus)
      ? raw.vehicleOrServiceFocus
      : [],
    availabilitySchedules: Array.isArray(raw.availabilitySchedules)
      ? raw.availabilitySchedules
      : [
          {
            id: "primary",
            isEnabled: true,
            weekdayNumbers: [2, 3, 4, 5, 6],
            startTime: null,
            endTime: null
          }
        ],
    timeZoneIdentifier: stringOrNull(raw.timeZoneIdentifier),
    preferredOfficeLocationId: preferredOffice,
    driversLicense: buildDriversLicense(raw),
    operatorAccreditation: buildOperatorAccreditation(raw),
    visibility: buildVisibility(raw)
  };
}

async function migrateBranchDrivers(db: Firestore, counts: Counts): Promise<void> {
  const branches = await db.collection("branches").get();
  for (const branchDoc of branches.docs) {
    const drivers = await branchDoc.ref.collection("drivers").get();
    for (const driverDoc of drivers.docs) {
      const path = driverDoc.ref.path;
      try {
        const d = driverDoc.data();
        if (!needsRosterNesting(d)) {
          counts.skipped += 1;
          continue;
        }
        const patch: DocumentData = {
          driversLicense: buildDriversLicense(d),
          operatorAccreditation: buildOperatorAccreditation(d),
          visibility: buildVisibility(d),
          preferredOfficeLocationId:
            stringOrNull(d.preferredOfficeLocationId) ??
            stringOrNull(d.preferredGarageLocationId) ??
            null,
          updatedAt: FieldValue.serverTimestamp()
        };
        for (const key of FLAT_ROSTER_DELETE_KEYS) {
          patch[key] = FieldValue.delete();
        }
        await driverDoc.ref.update(patch);
        counts.converted += 1;
        console.log(`roster converted: ${path}`);
      } catch (err) {
        counts.errors += 1;
        console.error(`roster error: ${path}`, err);
      }
    }
  }
}

function profileHasFlatAddress(profile: DocumentData): boolean {
  return FLAT_ADDRESS_KEYS.some((key) => hasOwn(profile, key));
}

async function migrateUsers(db: Firestore, counts: Counts): Promise<void> {
  const users = await db.collection("users").get();
  for (const userDoc of users.docs) {
    const path = userDoc.ref.path;
    try {
      const d = userDoc.data();
      const profile =
        d.profile && typeof d.profile === "object" ? ({ ...(d.profile as DocumentData) } as DocumentData) : {};
      let touched = false;

      if (profileHasFlatAddress(profile)) {
        if (!profile.address || typeof profile.address !== "object") {
          profile.address = {
            street: stringOrNull(profile.street),
            city: stringOrNull(profile.city),
            state: stringOrNull(profile.state),
            postcode: stringOrNull(profile.postcode),
            country: stringOrNull(profile.country)
          };
        }
        for (const key of FLAT_ADDRESS_KEYS) {
          delete profile[key];
        }
        touched = true;
      }

      const embedded =
        (d.driverProfile && typeof d.driverProfile === "object"
          ? (d.driverProfile as DocumentData)
          : null) ??
        (d.driverStaff && typeof d.driverStaff === "object" ? (d.driverStaff as DocumentData) : null);

      if (embedded) {
        const branchId =
          (typeof d.homeBranchId === "string" && d.homeBranchId.trim()) ||
          (typeof d.defaultBranchId === "string" && d.defaultBranchId.trim()) ||
          DEFAULT_BRANCH_ID;
        const rosterRef = db.collection("branches").doc(branchId).collection("drivers").doc(userDoc.id);
        const rosterSnap = await rosterRef.get();
        if (!rosterSnap.exists) {
          const now = FieldValue.serverTimestamp();
          await rosterRef.set({
            id: userDoc.id,
            userId: userDoc.id,
            ...nestedDriverProfileFromEmbedded(embedded),
            createdAt: now,
            updatedAt: now
          });
          console.log(`roster upserted from embedded: ${rosterRef.path}`);
        } else {
          console.log(`roster already present, skipping upsert: ${rosterRef.path}`);
        }
        await userDoc.ref.update({
          profile,
          driverProfile: FieldValue.delete(),
          driverStaff: FieldValue.delete()
        });
        touched = true;
        counts.converted += 1;
        console.log(`user embedded cleared: ${path}`);
        continue;
      }

      if (touched) {
        await userDoc.ref.update({ profile });
        counts.converted += 1;
        console.log(`user address nested: ${path}`);
      } else {
        counts.skipped += 1;
      }
    } catch (err) {
      counts.errors += 1;
      console.error(`user error: ${path}`, err);
    }
  }
}

async function main(): Promise<void> {
  const db = initDb();
  const counts: Counts = { converted: 0, skipped: 0, errors: 0 };

  console.log("Migrating branch drivers…");
  await migrateBranchDrivers(db, counts);

  console.log("Migrating users…");
  await migrateUsers(db, counts);

  console.log(
    `\nDone. converted=${counts.converted} skipped=${counts.skipped} errors=${counts.errors}`
  );
  if (counts.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
