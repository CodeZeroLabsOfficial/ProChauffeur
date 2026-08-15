import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminFirestore } from "@/lib/firebase/admin";
import { fetchAppSettingAdmin } from "@/lib/firebase/admin-settings";
import {
  AppSettingsDocs,
  BRANCH_OFFICE_FLEET_LOCATION_ID,
  BranchSettingsDocs,
  Collections,
  canCreateLocation,
  defaultLicense,
  isValidVehicleClassSlug,
  preparePricingConfigForSave,
  type Branch,
  type VehicleClass
} from "@/lib/models";
import { mapLicense } from "@/lib/services/mappers";
import {
  validateOperatorLocale,
  validatePricingConfig,
  validateVehicleClass
} from "@/lib/pricing/validate";
import { loadLocationRegionSeed } from "@/lib/seed/location/load-location-seed";
import {
  localeFromSeed,
  seedOperatingHours,
  seedPricingConfig,
  seedServiceAreaFromOffice
} from "@/lib/seed/location/schema";

export type CreateLocationFromSeedInput = {
  regionId: string;
  city: string;
  name: string;
  officeAddressLine: string;
  officeLatitude: number;
  officeLongitude: number;
  officePhone?: string | null;
  officeEmail?: string | null;
  contactUserId?: string | null;
  isActive: boolean;
};

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

async function allocateUniqueBranchId(name: string): Promise<string> {
  const base = slugFromName(name);
  if (!base) {
    throw new Error("Enter a location name with letters or numbers.");
  }
  const snap = await adminFirestore().collection(Collections.branches).get();
  const used = new Set(snap.docs.map((docSnap) => docSnap.id));
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base.slice(0, 60)}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("Could not allocate a unique location id.");
}

export async function createLocationFromSeedAdmin(
  input: CreateLocationFromSeedInput
): Promise<Branch> {
  const name = input.name.trim();
  const city = input.city.trim();
  const officeAddressLine = input.officeAddressLine.trim();
  if (!name) throw new Error("Enter a location name.");
  if (!city) throw new Error("Enter a city.");
  if (!officeAddressLine) throw new Error("Select an office address from the suggestions.");
  if (!Number.isFinite(input.officeLatitude) || !Number.isFinite(input.officeLongitude)) {
    throw new Error("Select an office address from the suggestions.");
  }

  const seed = await loadLocationRegionSeed(input.regionId);
  const locale = localeFromSeed(seed, city);
  validateOperatorLocale(locale);
  const pricing = preparePricingConfigForSave(seedPricingConfig(seed));
  validatePricingConfig(pricing);
  const hours = seedOperatingHours(seed);
  const serviceArea = seedServiceAreaFromOffice(seed, {
    addressLine: officeAddressLine,
    latitude: input.officeLatitude,
    longitude: input.officeLongitude
  });

  const licenseSnap = await fetchAppSettingAdmin(AppSettingsDocs.license);
  const license = licenseSnap ? mapLicense(licenseSnap) : defaultLicense;
  const existing = await adminFirestore().collection(Collections.branches).get();
  if (!canCreateLocation(existing.size, license.maxLocations)) {
    throw new Error(
      `Location limit reached (${license.maxLocations}). Raise maxLocations in License settings or remove a location.`
    );
  }

  const id = await allocateUniqueBranchId(name);
  const now = new Date();
  const branch: Branch = {
    id,
    name,
    isActive: input.isActive !== false,
    imageUrl: null,
    officeAddressLine,
    officeLatitude: input.officeLatitude,
    officeLongitude: input.officeLongitude,
    officePhone: input.officePhone?.trim() || null,
    officeEmail: input.officeEmail?.trim() || null,
    contactUserId: input.contactUserId?.trim() || null,
    serviceArea,
    autoDispatchEnabled: false,
    dynamicPricingEnabled: false,
    bookingValidationEnabled: false,
    createdAt: now,
    updatedAt: now
  };

  const db = adminFirestore();
  const branchRef = db.collection(Collections.branches).doc(id);
  const settings = branchRef.collection("settings");
  const classesCol = branchRef.collection("vehicle_classes");
  const officeRef = branchRef.collection("locations").doc(BRANCH_OFFICE_FLEET_LOCATION_ID);

  const batch = db.batch();
  batch.set(branchRef, {
    id: branch.id,
    name: branch.name,
    isActive: branch.isActive,
    imageUrl: null,
    officeAddressLine: branch.officeAddressLine,
    officeLatitude: branch.officeLatitude,
    officeLongitude: branch.officeLongitude,
    officePhone: branch.officePhone,
    officeEmail: branch.officeEmail,
    contactUserId: branch.contactUserId,
    serviceArea: branch.serviceArea,
    autoDispatchEnabled: false,
    dynamicPricingEnabled: false,
    bookingValidationEnabled: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  batch.set(settings.doc(BranchSettingsDocs.locale), { ...locale });
  batch.set(settings.doc(BranchSettingsDocs.pricing), pricing);
  batch.set(settings.doc(BranchSettingsDocs.operatingHours), {
    schedules: hours.schedules
  });
  batch.set(officeRef, {
    id: BRANCH_OFFICE_FLEET_LOCATION_ID,
    name: branch.name,
    addressLine: officeAddressLine,
    latitude: input.officeLatitude,
    longitude: input.officeLongitude,
    isDefault: true,
    createdAt: FieldValue.serverTimestamp()
  });

  for (const row of seed.vehicleClasses) {
    if (!isValidVehicleClassSlug(row.id) || row.id !== row.slug) {
      throw new Error(`Vehicle class id must be the product slug (${row.id}).`);
    }
    const vehicleClass: VehicleClass = {
      ...row,
      createdAt: now,
      updatedAt: now
    };
    validateVehicleClass(vehicleClass);
    const { createdAt: _c, updatedAt: _u, ...data } = vehicleClass;
    batch.set(classesCol.doc(row.id), {
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  }

  await batch.commit();
  return branch;
}
