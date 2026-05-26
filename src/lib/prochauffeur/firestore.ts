import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getCountFromServer,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseApp, getFirestoreDb } from "@/lib/firebase/client";
import {
  parseCompanyProfile,
  parseFleetLocation,
  parseFleetOperatingHours,
  parseGlobalLimits,
  parseTrip,
  parseUser,
  parseVehicle,
} from "@/lib/prochauffeur/parse";
import { prepareVehicleForSave } from "@/lib/prochauffeur/vehicleHelpers";
import {
  encodePricingConfig,
  parsePricingConfig,
} from "@/lib/prochauffeur/pricingHelpers";
import type {
  AppFleetOperatingHours,
  AppGlobalLimits,
  AppUser,
  CompanyProfile,
  DriverProfile,
  FleetLocation,
  PricingConfig,
  Trip,
  TripStatus,
  UserProfile,
  Vehicle,
} from "@/lib/prochauffeur/types";
import {
  DEFAULT_GLOBAL_LIMITS,
  EMPTY_COMPANY_PROFILE,
  EMPTY_OPERATING_HOURS,
} from "@/lib/prochauffeur/types";

const TRIPS = "trips";
const USERS = "users";
const VEHICLES = "vehicles";
const LOCATIONS = "locations";
const APP_SETTINGS = "app_settings";

function encodeUserProfile(profile: UserProfile): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    displayName: profile.displayName,
    phoneNumber: profile.phoneNumber ?? null,
    photoURL: profile.photoURL ?? null,
  };
  if (profile.dateOfBirth) {
    payload.dateOfBirth = Timestamp.fromDate(profile.dateOfBirth);
  }
  return payload;
}

function encodeWeeklySchedule(
  schedule: AppFleetOperatingHours["schedules"][number]
): Record<string, unknown> {
  return {
    id: schedule.id,
    isEnabled: schedule.isEnabled,
    weekdayNumbers: schedule.weekdayNumbers,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
  };
}

function encodeDriverProfile(profile: DriverProfile): Record<string, unknown> {
  return {
    chauffeurCategory: profile.chauffeurCategory,
    qualifications: profile.qualifications,
    bioStatement: profile.bioStatement,
    serviceSpecialties: profile.serviceSpecialties,
    vehicleOrServiceFocus: profile.vehicleOrServiceFocus,
    availabilitySchedules: profile.availabilitySchedules.map(encodeWeeklySchedule),
    timeZoneIdentifier: profile.timeZoneIdentifier,
    preferredGarageLocationId: profile.preferredGarageLocationId,
    driversLicenseSummary: profile.driversLicenseSummary,
    driversLicenseNumber: profile.driversLicenseNumber,
    driversLicenseClassOrType: profile.driversLicenseClassOrType,
    driversLicenseConditions: profile.driversLicenseConditions,
    driversLicenseConditionCodes: profile.driversLicenseConditionCodes,
    driversLicenseJurisdictionCode: profile.driversLicenseJurisdictionCode,
    driversLicenseExpiry: profile.driversLicenseExpiry
      ? Timestamp.fromDate(profile.driversLicenseExpiry)
      : null,
    operatorAccreditationNumber: profile.operatorAccreditationNumber,
    operatorAccreditationIssuingAuthority:
      profile.operatorAccreditationIssuingAuthority,
    operatorAccreditationExpiry: profile.operatorAccreditationExpiry
      ? Timestamp.fromDate(profile.operatorAccreditationExpiry)
      : null,
    visibleOnCustomerApp: profile.visibleOnCustomerApp,
    acceptsDispatchAssignments: profile.acceptsDispatchAssignments,
    homeAddressLine: profile.homeAddressLine,
  };
}

function encodeVehicle(vehicle: Vehicle): Record<string, unknown> {
  const prepared = prepareVehicleForSave(vehicle);
  return {
    driverID: prepared.driverID,
    assignedChauffeurUserId: prepared.assignedChauffeurUserId ?? "",
    make: prepared.make,
    model: prepared.model,
    color: prepared.color,
    licensePlate: prepared.licensePlate,
    passengerCapacity: prepared.passengerCapacity,
    manufactureYear: prepared.manufactureYear,
    registrationJurisdictionCode: prepared.registrationJurisdictionCode,
    registrationExpiry: prepared.registrationExpiry
      ? Timestamp.fromDate(prepared.registrationExpiry)
      : null,
    pricingVehicleType: prepared.pricingVehicleType,
    specificationChips: prepared.specificationChips,
    carFeatureRows: prepared.carFeatureRows,
    luggageDescription: prepared.luggageDescription,
    fleetSmallLuggageCount: prepared.fleetSmallLuggageCount,
    fleetLargeLuggageCount: prepared.fleetLargeLuggageCount,
    wifiServiceDescription: prepared.wifiServiceDescription,
    serviceClassDescription: prepared.serviceClassDescription,
    interiorDescription: prepared.interiorDescription,
    climateControlDescription: prepared.climateControlDescription,
    gearTypeDescription: prepared.gearTypeDescription,
  };
}

function encodeFleetLocation(location: FleetLocation): Record<string, unknown> {
  return {
    id: location.id,
    name: location.name,
    addressLine: location.addressLine,
    latitude: location.latitude,
    longitude: location.longitude,
    createdAt: Timestamp.fromDate(location.createdAt),
  };
}

function encodeOperatingHours(
  hours: AppFleetOperatingHours
): Record<string, unknown> {
  return {
    timeZoneIdentifier: hours.timeZoneIdentifier,
    schedules: hours.schedules.map(encodeWeeklySchedule),
  };
}

function encodeCompanyProfile(profile: CompanyProfile): Record<string, unknown> {
  return {
    displayName: profile.displayName,
    address: profile.address,
    phone: profile.phone,
    email: profile.email,
    website: profile.website,
    abn: profile.abn,
    acn: profile.acn,
    logoURL: profile.logoURL,
  };
}

function coerceFirestoreInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "bigint") return Number(value);
  return null;
}

export function listenTripsForAdminOverview(
  onUpdate: (trips: Trip[]) => void,
  tripLimit = 800
): () => void {
  const q = query(
    collection(getFirestoreDb(), TRIPS),
    orderBy("createdAt", "desc"),
    limit(tripLimit)
  );
  return onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map((d) => parseTrip(d.id, d.data()));
    onUpdate(trips);
  });
}

export function listenUsersForAdmin(onUpdate: (users: AppUser[]) => void): () => void {
  return onSnapshot(collection(getFirestoreDb(), USERS), (snapshot) => {
    const users = snapshot.docs.map((d) => parseUser(d.id, d.data()));
    onUpdate(users);
  });
}

export function listenTrip(
  tripId: string,
  onUpdate: (trip: Trip | null) => void
): () => void {
  return onSnapshot(doc(getFirestoreDb(), TRIPS, tripId), (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }
    onUpdate(parseTrip(snapshot.id, snapshot.data()));
  });
}

export function listenFleetVehicles(
  onUpdate: (vehicles: Vehicle[]) => void
): () => void {
  return onSnapshot(collection(getFirestoreDb(), VEHICLES), (snapshot) => {
    const vehicles = snapshot.docs
      .map((d) => parseVehicle(d.id, d.data()))
      .sort((a, b) =>
        `${a.color} ${a.make} ${a.model}`.localeCompare(
          `${b.color} ${b.make} ${b.model}`,
          undefined,
          { sensitivity: "base" }
        )
      );
    onUpdate(vehicles);
  });
}

export function listenFleetLocations(
  onUpdate: (locations: FleetLocation[]) => void
): () => void {
  const q = query(
    collection(getFirestoreDb(), LOCATIONS),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    onUpdate(snapshot.docs.map((d) => parseFleetLocation(d.id, d.data())));
  });
}

export function listenGlobalLimits(
  onUpdate: (limits: AppGlobalLimits) => void
): () => void {
  return onSnapshot(
    doc(getFirestoreDb(), APP_SETTINGS, "limits"),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(DEFAULT_GLOBAL_LIMITS);
        return;
      }
      onUpdate(parseGlobalLimits(snapshot.data()));
    }
  );
}

export function listenOperatingHours(
  onUpdate: (hours: AppFleetOperatingHours) => void
): () => void {
  return onSnapshot(
    doc(getFirestoreDb(), APP_SETTINGS, "operating_hours"),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(EMPTY_OPERATING_HOURS);
        return;
      }
      onUpdate(parseFleetOperatingHours(snapshot.data()));
    }
  );
}

export function listenCompanyProfile(
  onUpdate: (profile: CompanyProfile) => void
): () => void {
  return onSnapshot(
    doc(getFirestoreDb(), APP_SETTINGS, "company"),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(EMPTY_COMPANY_PROFILE);
        return;
      }
      onUpdate(parseCompanyProfile(snapshot.data()));
    }
  );
}

export function listenPricingConfig(
  onUpdate: (config: PricingConfig | null, exists: boolean) => void
): () => void {
  return onSnapshot(
    doc(getFirestoreDb(), APP_SETTINGS, "pricing"),
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null, false);
        return;
      }
      onUpdate(parsePricingConfig(snapshot.data()), true);
    }
  );
}

export async function fetchUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(getFirestoreDb(), USERS, uid));
  if (!snap.exists()) return null;
  return parseUser(snap.id, snap.data());
}

export async function updateTripStatus(
  tripId: string,
  status: TripStatus
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), TRIPS, tripId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserProfile(
  uid: string,
  profile: UserProfile
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), USERS, uid), {
    profile: encodeUserProfile(profile),
  });
}

export async function updateUserDriverProfile(
  uid: string,
  driverProfile: DriverProfile
): Promise<void> {
  await updateDoc(doc(getFirestoreDb(), USERS, uid), {
    driverProfile: encodeDriverProfile(driverProfile),
    driverStaff: deleteField(),
  });
}

export async function upsertVehicle(vehicle: Vehicle): Promise<void> {
  await setDoc(
    doc(getFirestoreDb(), VEHICLES, vehicle.driverID),
    encodeVehicle(vehicle)
  );
}

export async function deleteVehicleIfExists(driverID: string): Promise<void> {
  const ref = doc(getFirestoreDb(), VEHICLES, driverID);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await deleteDoc(ref);
  }
}

export async function assignFleetVehicle(
  vehicles: Vehicle[],
  vehicleDocumentId: string,
  chauffeurUserId: string
): Promise<void> {
  const batch = writeBatch(getFirestoreDb());
  let found = false;

  for (const vehicle of vehicles) {
    const vehicleId = vehicle.driverID;
    if (vehicleId === vehicleDocumentId) found = true;

    const effective =
      vehicle.assignedChauffeurUserId === ""
        ? null
        : vehicle.assignedChauffeurUserId ?? vehicle.driverID;

    if (effective === chauffeurUserId && vehicleId !== vehicleDocumentId) {
      batch.update(doc(getFirestoreDb(), VEHICLES, vehicleId), {
        assignedChauffeurUserId: "",
      });
    }
  }

  if (!found) {
    throw new Error("Vehicle not found for assignment.");
  }

  batch.update(doc(getFirestoreDb(), VEHICLES, vehicleDocumentId), {
    assignedChauffeurUserId: chauffeurUserId,
  });
  await batch.commit();
}

export async function unassignFleetVehicleFromChauffeur(
  vehicles: Vehicle[],
  chauffeurUserId: string
): Promise<void> {
  const batch = writeBatch(getFirestoreDb());
  let wrote = false;

  for (const vehicle of vehicles) {
    const effective =
      vehicle.assignedChauffeurUserId === ""
        ? null
        : vehicle.assignedChauffeurUserId ?? vehicle.driverID;
    if (effective === chauffeurUserId) {
      batch.update(doc(getFirestoreDb(), VEHICLES, vehicle.driverID), {
        assignedChauffeurUserId: "",
      });
      wrote = true;
    }
  }

  if (wrote) {
    await batch.commit();
  }
}

export async function fetchGlobalLimits(): Promise<AppGlobalLimits> {
  const snap = await getDoc(doc(getFirestoreDb(), APP_SETTINGS, "limits"));
  if (!snap.exists()) return DEFAULT_GLOBAL_LIMITS;
  return parseGlobalLimits(snap.data());
}

export async function countFleetLocations(): Promise<number> {
  const snap = await getCountFromServer(collection(getFirestoreDb(), LOCATIONS));
  return snap.data().count;
}

export async function createFleetLocation(input: {
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
}): Promise<string> {
  const limits = await fetchGlobalLimits();
  const current = await countFleetLocations();
  if (current >= limits.maxLocations) {
    throw new Error(
      `Maximum number of locations (${limits.maxLocations === Number.MAX_SAFE_INTEGER ? "Unlimited" : limits.maxLocations}) reached.`
    );
  }

  const name = input.name.trim();
  const addressLine = input.addressLine.trim();
  if (!name || !addressLine) {
    throw new Error("Name and address are required.");
  }

  const id = crypto.randomUUID();
  const location: FleetLocation = {
    id,
    name,
    addressLine,
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt: new Date(),
  };

  await setDoc(
    doc(getFirestoreDb(), LOCATIONS, id),
    encodeFleetLocation(location)
  );
  return id;
}

export async function updateFleetLocation(location: FleetLocation): Promise<void> {
  const name = location.name.trim();
  const addressLine = location.addressLine.trim();
  if (!name || !addressLine) {
    throw new Error("Name and address are required.");
  }
  await setDoc(
    doc(getFirestoreDb(), LOCATIONS, location.id),
    encodeFleetLocation({ ...location, name, addressLine })
  );
}

export async function deleteFleetLocation(id: string): Promise<void> {
  await deleteDoc(doc(getFirestoreDb(), LOCATIONS, id));
}

export async function saveFleetOperatingHours(
  hours: AppFleetOperatingHours
): Promise<void> {
  await setDoc(
    doc(getFirestoreDb(), APP_SETTINGS, "operating_hours"),
    encodeOperatingHours(hours)
  );
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<void> {
  await setDoc(
    doc(getFirestoreDb(), APP_SETTINGS, "company"),
    encodeCompanyProfile(profile)
  );
}

export async function savePricingConfig(config: PricingConfig): Promise<void> {
  await setDoc(
    doc(getFirestoreDb(), APP_SETTINGS, "pricing"),
    encodePricingConfig(config)
  );
}

export async function fetchPricingConfig(): Promise<PricingConfig | null> {
  const snap = await getDoc(doc(getFirestoreDb(), APP_SETTINGS, "pricing"));
  if (!snap.exists()) return null;
  return parsePricingConfig(snap.data());
}

export async function deleteDriverFleetDocuments(uid: string): Promise<void> {
  const userRef = doc(getFirestoreDb(), USERS, uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error("Driver account not found.");
  }
  const user = parseUser(userSnap.id, userSnap.data());
  if (user.role !== "driver") {
    throw new Error("Only driver accounts can be deleted from the roster.");
  }

  const functions = getFunctions(getFirebaseApp());
  const deleteDriverAuth = httpsCallable(functions, "deleteDriverAuth");
  await deleteDriverAuth({ targetUid: uid });

  await deleteVehicleIfExists(uid);
  await deleteDoc(userRef);
}
