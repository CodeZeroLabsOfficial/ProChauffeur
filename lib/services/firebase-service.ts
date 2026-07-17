"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  deleteField,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type FirestoreError,
  type QuerySnapshot
} from "firebase/firestore";
import { firestore, firebaseAuth } from "@/lib/firebase/client";
import {
  coordinateToFirestoreField,
  coordinateToGeoPoint,
  stripUndefined
} from "@/lib/firebase/converters";
import {
  invalidateOperatorLocaleCache,
  invalidatePricingConfigurationCache
} from "@/lib/services/operator-config-cache";
import {
  companyNotification,
  driverNotification,
  invoiceNotification,
  localeNotification,
  locationNotification,
  operatingHoursNotification,
  pricingNotification,
  profileNotification,
  vehicleDisplayTitle,
  vehicleNotification
} from "@/lib/notifications/messages";
import {
  AppSettingsDocs,
  Collections,
  emptyCompanyProfile,
  emptyOperatingHours,
  unlimitedLimits,
  type ActivityNotification,
  type CompanyProfile,
  type CreateActivityNotificationInput,
  type OperatorLocale,
  type AppFleetOperatingHours,
  type AppGlobalLimits,
  type DriverProfile,
  type FleetLocation,
  type Invoice,
  type PricingConfig,
  type Trip,
  type TripStatus,
  type User,
  type UserPreferences,
  type UserProfile,
  type UserRole,
  type Vehicle,
  type VehicleClass
} from "@/lib/models";
import {
  mapActivityNotification,
  mapBranch,
  mapCompanyProfile,
  mapOperatorLocale,
  mapFleetLocation,
  mapInvoice,
  mapLimits,
  mapOperatingHours,
  mapPricingConfig,
  mapTrip,
  mapUser,
  mapVehicle,
  mapVehicleClass
} from "@/lib/services/mappers";
import { ConfigError } from "@/lib/pricing/errors";
import { validateOperatorLocale, validatePricingConfig, validateVehicleClass } from "@/lib/pricing/validate";
import { getActiveBranchId } from "@/lib/branch/active-branch-store";
import {
  branchCollectionRef,
  branchDocRef,
  branchMetaDocRef,
  branchSettingsDocRef,
  branchesCollectionRef
} from "@/lib/branch/firestore-paths";
import { listenQuery } from "@/lib/branch/listen-query";
import { BranchSettingsDocs, DEFAULT_BRANCH_ID, BRANCH_OFFICE_FLEET_LOCATION_ID, type Branch } from "@/lib/models/branch";
import { canCreateLocation } from "@/lib/models";

type Unsub = () => void;

function db() {
  return firestore();
}

function snapToList<T>(snap: QuerySnapshot<DocumentData>, map: (id: string, d: DocumentData) => T): T[] {
  return snap.docs.map((dc) => map(dc.id, dc.data()));
}

function onSnapshotError<T>(label: string, onUpdate: (rows: T[]) => void) {
  return (error: FirestoreError) => {
    console.error(`Firestore ${label} listener failed:`, error.code, error.message);
    onUpdate([]);
  };
}

async function resolveActor(): Promise<{ actorId?: string; actorName?: string }> {
  const authUser = firebaseAuth().currentUser;
  if (!authUser) return {};
  const actorId = authUser.uid;
  let actorName = authUser.displayName?.trim() || undefined;
  if (!actorName) {
    const snap = await getDoc(doc(db(), Collections.users, actorId));
    if (snap.exists()) {
      const user = mapUser(snap.id, snap.data());
      actorName = user.profile.displayName?.trim() || user.email || undefined;
    }
  }
  return { actorId, actorName };
}

/** Best-effort activity notification write; never throws to callers. */
export async function createActivityNotification(input: CreateActivityNotificationInput): Promise<void> {
  try {
    const actor = await resolveActor();
    await addDoc(collection(db(), Collections.notifications), stripUndefined({
      ...input,
      actorId: input.actorId ?? actor.actorId,
      actorName: input.actorName ?? actor.actorName,
      readAt: null,
      createdAt: serverTimestamp()
    }));
  } catch (err) {
    console.error("Failed to write activity notification:", err);
  }
}

export function listenNotifications(onUpdate: (rows: ActivityNotification[]) => void, max = 50): Unsub {
  const q = query(
    collection(db(), Collections.notifications),
    orderBy("createdAt", "desc"),
    fsLimit(max)
  );
  return onSnapshot(
    q,
    (snap) => onUpdate(snapToList(snap, mapActivityNotification)),
    onSnapshotError("notifications", onUpdate)
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db(), Collections.notifications, id), { readAt: serverTimestamp() });
}

export async function markAllNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const batch = writeBatch(db());
  for (const id of ids) {
    batch.update(doc(db(), Collections.notifications, id), { readAt: serverTimestamp() });
  }
  await batch.commit();
}

// ─────────────────────────────── Branches ───────────────────────────────

export function listenBranches(onUpdate: (branches: Branch[]) => void): Unsub {
  return onSnapshot(
    branchesCollectionRef(db()),
    (snap) => onUpdate(snapToList(snap, mapBranch)),
    onSnapshotError("branches", onUpdate)
  );
}

export async function fetchBranches(): Promise<Branch[]> {
  return snapToList(await getDocs(branchesCollectionRef(db())), mapBranch);
}

export async function fetchBranch(branchId: string): Promise<Branch | null> {
  const snap = await getDoc(branchMetaDocRef(db(), branchId));
  return snap.exists() ? mapBranch(snap.id, snap.data()) : null;
}

export async function upsertBranch(branch: Branch): Promise<void> {
  const ref = branchMetaDocRef(db(), branch.id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    const limits = await fetchGlobalLimits();
    const current = await fetchBranches();
    if (!canCreateLocation(current.length, limits.maxLocations)) {
      throw new Error(
        `Location limit reached (${limits.maxLocations}). Raise maxLocations in License settings or remove a location.`
      );
    }
  }
  await setDoc(
    ref,
    stripUndefined({
      id: branch.id,
      name: branch.name,
      isActive: branch.isActive,
      timeZoneIdentifier: branch.timeZoneIdentifier ?? null,
      officeAddressLine: branch.officeAddressLine ?? null,
      officeLatitude: branch.officeLatitude ?? null,
      officeLongitude: branch.officeLongitude ?? null,
      officePhone: branch.officePhone ?? null,
      serviceArea: branch.serviceArea ?? null,
      createdAt: existing.exists() ? branch.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp()
    }),
    { merge: true }
  );
}

export type OfficeFleetSyncInput = {
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  timeZoneIdentifier?: string | null;
};

/**
 * Upserts the default FleetLocation used for quoting from the Location office.
 * Doc id is always `office` under the branch.
 */
export async function syncOfficeFleetLocation(
  branchId: string,
  office: OfficeFleetSyncInput
): Promise<void> {
  const addressLine = office.addressLine.trim();
  if (!addressLine) return;
  if (!Number.isFinite(office.latitude) || !Number.isFinite(office.longitude)) {
    throw new Error("Select an office address from the suggestions.");
  }

  await clearOtherDefaultFleetLocationsInBranch(branchId, BRANCH_OFFICE_FLEET_LOCATION_ID);

  const ref = branchDocRef(db(), "locations", BRANCH_OFFICE_FLEET_LOCATION_ID, branchId);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    stripUndefined({
      id: BRANCH_OFFICE_FLEET_LOCATION_ID,
      name: office.name.trim() || "Office",
      addressLine,
      latitude: office.latitude,
      longitude: office.longitude,
      isDefault: true,
      timeZoneIdentifier: office.timeZoneIdentifier ?? null,
      createdAt: existing.exists() ? existing.data()?.createdAt ?? serverTimestamp() : serverTimestamp()
    }),
    { merge: true }
  );
}

/** Allocates a unique branch id from a display name (slug, then -2, -3, …). */
export async function allocateUniqueBranchId(name: string): Promise<string> {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  if (!base) {
    throw new Error("Enter a location name with letters or numbers.");
  }
  const existing = await fetchBranches();
  const used = new Set(existing.map((b) => b.id));
  if (!used.has(base)) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base.slice(0, 60)}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("Could not allocate a unique location id.");
}

/**
 * Creates a Location (branch) and copies pricing, operating hours, and vehicle
 * classes from `sourceBranchId` (default Brisbane).
 */
export async function createLocationWithScaffold(
  branch: Branch,
  options?: { sourceBranchId?: string }
): Promise<void> {
  const sourceBranchId = options?.sourceBranchId ?? DEFAULT_BRANCH_ID;
  const existing = await getDoc(branchMetaDocRef(db(), branch.id));
  if (existing.exists()) {
    throw new Error(`A location with id "${branch.id}" already exists.`);
  }
  await upsertBranch(branch);

  if (
    branch.officeAddressLine?.trim() &&
    typeof branch.officeLatitude === "number" &&
    typeof branch.officeLongitude === "number"
  ) {
    await syncOfficeFleetLocation(branch.id, {
      name: branch.name,
      addressLine: branch.officeAddressLine,
      latitude: branch.officeLatitude,
      longitude: branch.officeLongitude,
      timeZoneIdentifier: branch.timeZoneIdentifier
    });
  }

  const settingsToCopy = [
    BranchSettingsDocs.pricing,
    BranchSettingsDocs.operatingHours
  ] as const;
  for (const docId of settingsToCopy) {
    const source = await getDoc(branchSettingsDocRef(db(), docId, sourceBranchId));
    if (source.exists()) {
      await setDoc(branchSettingsDocRef(db(), docId, branch.id), source.data());
    }
  }

  const classesSnap = await getDocs(branchCollectionRef(db(), "vehicle_classes", sourceBranchId));
  for (const classDoc of classesSnap.docs) {
    await setDoc(branchDocRef(db(), "vehicle_classes", classDoc.id, branch.id), classDoc.data());
  }
}

// ─────────────────────────────── Trips ───────────────────────────────

/** Admin overview listener: recent trips for the active branch, newest first. */
export function listenTrips(onUpdate: (trips: Trip[]) => void, max = 800): Unsub {
  const branchId = getActiveBranchId();
  const nested = query(
    branchCollectionRef(db(), "trips", branchId),
    orderBy("createdAt", "desc"),
    fsLimit(max)
  );
  return listenQuery(
    nested,
    (snap) => snapToList(snap, mapTrip),
    onUpdate,
    onSnapshotError("trips", onUpdate)
  );
}

export async function fetchTrips(max = 800): Promise<Trip[]> {
  const branchId = getActiveBranchId();
  const nested = query(
    branchCollectionRef(db(), "trips", branchId),
    orderBy("createdAt", "desc"),
    fsLimit(max)
  );
  return snapToList(await getDocs(nested), mapTrip);
}

export async function fetchTrip(id: string, branchId: string = getActiveBranchId()): Promise<Trip | null> {
  const nested = await getDoc(branchDocRef(db(), "trips", id, branchId));
  return nested.exists() ? mapTrip(nested.id, nested.data()) : null;
}

/** Realtime listener for a single trip document. */
export function listenTrip(id: string, onUpdate: (trip: Trip | null) => void): Unsub {
  const branchId = getActiveBranchId();
  return onSnapshot(
    branchDocRef(db(), "trips", id, branchId),
    (snap) => {
      onUpdate(snap.exists() ? mapTrip(snap.id, snap.data()) : null);
    },
    (error) => {
      console.error("Firestore trip listener failed:", error.code, error.message);
      onUpdate(null);
    }
  );
}

export async function updateTripStatus(id: string, status: TripStatus): Promise<void> {
  const res = await fetch(`/api/trips/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, branchId: getActiveBranchId() })
  });

  if (!res.ok) {
    let message = "Could not update the booking.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
}

export async function assignTripDriver(
  id: string,
  driverID: string | null,
  vehicleDocumentId?: string | null,
  vehicleSnapshot?: Vehicle | null
): Promise<void> {
  await updateDoc(
    branchDocRef(db(), "trips", id),
    stripUndefined({
      driverID,
      vehicleDocumentId: driverID ? vehicleDocumentId : null,
      fleetVehicleDocumentId: deleteField(),
      vehicleSnapshot: driverID ? vehicleSnapshot : null,
      updatedAt: serverTimestamp()
    })
  );
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<void> {
  await updateDoc(
    branchDocRef(db(), "trips", id),
    stripUndefined({
      ...patch,
      pickup: patch.pickup ? coordinateToFirestoreField(patch.pickup) : undefined,
      dropoff: patch.dropoff ? coordinateToFirestoreField(patch.dropoff) : undefined,
      updatedAt: serverTimestamp()
    })
  );
}

function tripFirestorePayload(trip: Trip): Record<string, unknown> {
  const now = new Date();
  return stripUndefined({
    ...trip,
    pickup: coordinateToFirestoreField(trip.pickup),
    dropoff: coordinateToFirestoreField(trip.dropoff),
    liveLocation: trip.liveLocation ? coordinateToGeoPoint(trip.liveLocation) : undefined,
    createdAt: trip.createdAt ?? now,
    updatedAt: trip.updatedAt ?? now
  });
}

export async function createTrip(trip: Trip): Promise<void> {
  await setDoc(branchDocRef(db(), "trips", trip.id), tripFirestorePayload(trip));
}

export async function createRoundTripBookings(outbound: Trip, returnLeg: Trip): Promise<void> {
  const batch = writeBatch(db());
  batch.set(branchDocRef(db(), "trips", outbound.id), tripFirestorePayload(outbound));
  batch.set(branchDocRef(db(), "trips", returnLeg.id), tripFirestorePayload(returnLeg));
  await batch.commit();
}

// ─────────────────────────────── Users ───────────────────────────────

export function listenUsers(onUpdate: (users: User[]) => void): Unsub {
  return onSnapshot(
    collection(db(), Collections.users),
    (snap) => onUpdate(snapToList(snap, mapUser)),
    onSnapshotError("users", onUpdate)
  );
}

export async function fetchUsers(): Promise<User[]> {
  return snapToList(await getDocs(collection(db(), Collections.users)), mapUser);
}

export async function fetchUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db(), Collections.users, uid));
  return snap.exists() ? mapUser(snap.id, snap.data()) : null;
}

/** Firebase Auth last sign-in; null if never signed in or no Auth user. */
export async function fetchUserLastSignIn(uid: string): Promise<Date | null> {
  const res = await fetch(`/api/users/${uid}/last-sign-in`);
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as { lastSignInAt?: string | null };
  if (!body.lastSignInAt) return null;
  const date = new Date(body.lastSignInAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type CreateCustomerInput = {
  email: string;
  password: string;
  displayName: string;
  phoneNumber?: string;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
};

export async function createCustomer(input: CreateCustomerInput): Promise<{ uid: string }> {
  const res = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const body = (await res.json().catch(() => ({}))) as { uid?: string; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Could not create customer.");
  }
  if (!body.uid) {
    throw new Error("Could not create customer.");
  }
  return { uid: body.uid };
}

export async function updateUserProfile(uid: string, profile: UserProfile): Promise<void> {
  await updateDoc(doc(db(), Collections.users, uid), { profile: stripUndefined({ ...profile }) });
  const title = profile.displayName?.trim() || "Profile";
  void createActivityNotification(profileNotification(title, uid));
}

export async function updateUserPreferences(
  uid: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (preferences.bookingsDefaultDateRange !== undefined) {
    updates["preferences.bookingsDefaultDateRange"] =
      preferences.bookingsDefaultDateRange === null
        ? deleteField()
        : preferences.bookingsDefaultDateRange;
  }
  if (Object.keys(updates).length === 0) return;
  await updateDoc(doc(db(), Collections.users, uid), updates);
}

export async function updateUserEmail(uid: string, email: string): Promise<void> {
  await updateDoc(doc(db(), Collections.users, uid), { email: email.trim() });
}

export async function uploadUserProfilePhoto(uid: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("uid", uid);
  const res = await fetch("/api/profile/photo", { method: "POST", body: formData });
  const body = (await res.json().catch(() => ({}))) as { photoURL?: string; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Could not upload profile photo.");
  }
  if (!body.photoURL) {
    throw new Error("Could not upload profile photo.");
  }
  return body.photoURL;
}

export async function uploadWorkspaceLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/settings/workspace/logo", { method: "POST", body: formData });
  const body = (await res.json().catch(() => ({}))) as { logoUrl?: string; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Could not upload logo.");
  }
  if (!body.logoUrl) {
    throw new Error("Could not upload logo.");
  }
  return body.logoUrl;
}

export async function uploadWorkspaceFavicon(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/settings/workspace/favicon", { method: "POST", body: formData });
  const body = (await res.json().catch(() => ({}))) as { faviconUrl?: string; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Could not upload favicon.");
  }
  if (!body.faviconUrl) {
    throw new Error("Could not upload favicon.");
  }
  return body.faviconUrl;
}

export async function uploadVehicleClassImage(classId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/vehicle-classes/${encodeURIComponent(classId)}/image`, {
    method: "POST",
    body: formData
  });
  const body = (await res.json().catch(() => ({}))) as { imageUrl?: string; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Could not upload vehicle class image.");
  }
  if (!body.imageUrl) {
    throw new Error("Could not upload vehicle class image.");
  }
  return body.imageUrl;
}

export async function updateUserDriverProfile(
  uid: string,
  driverProfile: DriverProfile,
  options?: { driverTitle?: string; isNew?: boolean }
): Promise<void> {
  await updateDoc(doc(db(), Collections.users, uid), {
    driverProfile: stripUndefined({ ...driverProfile })
  });
  if (options?.driverTitle) {
    const action = options.isNew ? "created" : "updated";
    void createActivityNotification(driverNotification(action, options.driverTitle, uid));
  }
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db(), Collections.users, uid), { role });
}

/** Demotes a chauffeur to customer and removes their driver profile (and fleet vehicle if any). */
export async function removeDriver(uid: string, driverTitle?: string): Promise<void> {
  const vehicleRef = branchDocRef(db(), "vehicles", uid);
  const vehicleSnap = await getDoc(vehicleRef);
  if (vehicleSnap.exists()) {
    await deleteVehicle(uid);
  }
  await updateDoc(doc(db(), Collections.users, uid), {
    role: "customer",
    driverProfile: deleteField(),
    homeBranchId: deleteField()
  });
  try {
    await deleteDoc(branchDocRef(db(), "drivers", uid));
  } catch {
    /* roster entry may not exist yet */
  }
  void createActivityNotification(driverNotification("deleted", driverTitle ?? "Chauffeur", uid));
}

// ────────────────────────────── Vehicles ─────────────────────────────

export function listenVehicles(onUpdate: (vehicles: Vehicle[]) => void): Unsub {
  const branchId = getActiveBranchId();
  const nested = query(branchCollectionRef(db(), "vehicles", branchId));
  return listenQuery(
    nested,
    (snap) => {
      const rows = snapToList(snap, (_, d) => mapVehicle(d));
      rows.sort((a, b) =>
        `${a.color} ${a.make} ${a.model}`.localeCompare(`${b.color} ${b.make} ${b.model}`)
      );
      return rows;
    },
    onUpdate,
    onSnapshotError("vehicles", onUpdate)
  );
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const branchId = getActiveBranchId();
  const nestedSnap = await getDocs(branchCollectionRef(db(), "vehicles", branchId));
  return nestedSnap.docs.map((dc) => mapVehicle(dc.data()));
}

export async function fetchVehicle(vehicleDocumentId: string): Promise<Vehicle | null> {
  const nested = await getDoc(branchDocRef(db(), "vehicles", vehicleDocumentId));
  return nested.exists() ? mapVehicle(nested.data()) : null;
}

export async function upsertVehicle(vehicle: Vehicle): Promise<void> {
  const ref = branchDocRef(db(), "vehicles", vehicle.driverID);
  const existing = await getDoc(ref);
  const action = existing.exists() ? "updated" : "created";
  await setDoc(ref, stripUndefined({ ...vehicle }));
  void createActivityNotification(
    vehicleNotification(action, vehicleDisplayTitle(vehicle), vehicle.driverID)
  );
}

export async function deleteVehicle(driverID: string): Promise<void> {
  const ref = branchDocRef(db(), "vehicles", driverID);
  const snap = await getDoc(ref);
  const title = snap.exists() ? vehicleDisplayTitle(mapVehicle(snap.data())) : "Fleet vehicle";
  await deleteDoc(ref);
  void createActivityNotification(vehicleNotification("deleted", title, driverID));
}

/** Assign a fleet vehicle to a chauffeur, clearing prior links. */
export async function assignFleetVehicle(
  vehicles: Vehicle[],
  vehicleDocumentId: string,
  toChauffeurUserId: string
): Promise<void> {
  const batch = writeBatch(db());
  let found = false;
  for (const v of vehicles) {
    if (v.driverID === vehicleDocumentId) found = true;
    const linked = v.assignedChauffeurUserId == null ? v.driverID : v.assignedChauffeurUserId || null;
    if (linked === toChauffeurUserId && v.driverID !== vehicleDocumentId) {
      batch.update(branchDocRef(db(), "vehicles", v.driverID), { assignedChauffeurUserId: "" });
    }
  }
  if (!found) throw new Error("That fleet vehicle no longer exists. Refresh and try again.");
  batch.update(branchDocRef(db(), "vehicles", vehicleDocumentId), {
    assignedChauffeurUserId: toChauffeurUserId
  });
  await batch.commit();
}

/** Clears the chauffeur linked to a fleet vehicle. */
export async function unassignFleetVehicle(vehicleDocumentId: string): Promise<void> {
  await updateDoc(branchDocRef(db(), "vehicles", vehicleDocumentId), {
    assignedChauffeurUserId: ""
  });
}

// ───────────────────────────── Locations ─────────────────────────────

export function listenFleetLocations(onUpdate: (locations: FleetLocation[]) => void): Unsub {
  const branchId = getActiveBranchId();
  const nested = query(
    branchCollectionRef(db(), "locations", branchId),
    orderBy("createdAt", "desc")
  );
  return listenQuery(
    nested,
    (snap) => snapToList(snap, mapFleetLocation),
    onUpdate,
    onSnapshotError("locations", onUpdate)
  );
}

export async function fetchFleetLocations(): Promise<FleetLocation[]> {
  const branchId = getActiveBranchId();
  const nested = query(
    branchCollectionRef(db(), "locations", branchId),
    orderBy("createdAt", "desc")
  );
  return snapToList(await getDocs(nested), mapFleetLocation);
}

async function clearOtherDefaultFleetLocations(
  exceptId: string,
  branchId: string = getActiveBranchId()
): Promise<void> {
  await clearOtherDefaultFleetLocationsInBranch(branchId, exceptId);
}

async function clearOtherDefaultFleetLocationsInBranch(
  branchId: string,
  exceptId: string
): Promise<void> {
  const snap = await getDocs(branchCollectionRef(db(), "locations", branchId));
  const batch = writeBatch(db());
  let hasUpdates = false;

  for (const docSnap of snap.docs) {
    if (docSnap.id !== exceptId && docSnap.data().isDefault === true) {
      batch.update(docSnap.ref, { isDefault: false });
      hasUpdates = true;
    }
  }

  if (hasUpdates) await batch.commit();
}

export async function createFleetLocation(input: {
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}): Promise<void> {
  const name = input.name.trim();
  const addressLine = input.addressLine.trim();
  if (!name || !addressLine) throw new Error("Enter a name and address before saving this garage.");
  const id = crypto.randomUUID();
  const isDefault = input.isDefault === true;

  if (isDefault) await clearOtherDefaultFleetLocations(id);

  await setDoc(branchDocRef(db(), "locations", id), {
    id,
    name,
    addressLine,
    latitude: input.latitude,
    longitude: input.longitude,
    isDefault,
    createdAt: serverTimestamp()
  });
  void createActivityNotification(locationNotification("created", name, id));
}

export async function updateFleetLocation(location: FleetLocation): Promise<void> {
  const name = location.name.trim();
  const addressLine = location.addressLine.trim();
  if (!name || !addressLine) throw new Error("Enter a name and address before saving this garage.");
  const isDefault = location.isDefault === true;

  if (isDefault) await clearOtherDefaultFleetLocations(location.id);

  await updateDoc(branchDocRef(db(), "locations", location.id), {
    name,
    addressLine,
    latitude: location.latitude,
    longitude: location.longitude,
    isDefault
  });
  void createActivityNotification(locationNotification("updated", name, location.id));
}

export async function deleteFleetLocation(id: string): Promise<void> {
  const ref = branchDocRef(db(), "locations", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const location = mapFleetLocation(snap.id, snap.data());
  if (location.isDefault) {
    throw new Error(
      "Cannot delete the default garage. Set another garage as default first."
    );
  }
  await deleteDoc(ref);
  void createActivityNotification(locationNotification("deleted", location.name, id));
}

// ───────────────────────── App settings (config) ─────────────────────

export async function fetchPricingConfiguration(
  branchId: string = getActiveBranchId()
): Promise<PricingConfig> {
  const nested = await getDoc(branchSettingsDocRef(db(), BranchSettingsDocs.pricing, branchId));
  if (!nested.exists()) {
    throw new ConfigError("Pricing is not configured. Set pricing for this location first.");
  }
  return mapPricingConfig(nested.data());
}

export async function savePricingConfiguration(
  config: PricingConfig,
  branchId: string = getActiveBranchId()
): Promise<void> {
  validatePricingConfig(config);
  await setDoc(
    branchSettingsDocRef(db(), BranchSettingsDocs.pricing, branchId),
    stripUndefined({ ...config }),
    { merge: true }
  );
  invalidatePricingConfigurationCache();
  void createActivityNotification(pricingNotification());
}

// ───────────────────────── Vehicle classes ─────────────────────────

export async function fetchVehicleClasses(): Promise<VehicleClass[]> {
  const branchId = getActiveBranchId();
  const nestedSnap = await getDocs(branchCollectionRef(db(), "vehicle_classes", branchId));
  return nestedSnap.docs
    .map((docSnap) => mapVehicleClass(docSnap.id, docSnap.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
}

export async function fetchVehicleClass(id: string): Promise<VehicleClass | null> {
  const nested = await getDoc(branchDocRef(db(), "vehicle_classes", id));
  return nested.exists() ? mapVehicleClass(nested.id, nested.data()) : null;
}

export function listenVehicleClasses(onUpdate: (classes: VehicleClass[]) => void): Unsub {
  const branchId = getActiveBranchId();
  const nested = query(branchCollectionRef(db(), "vehicle_classes", branchId));
  return listenQuery(
    nested,
    (snap) =>
      snap.docs
        .map((docSnap) => mapVehicleClass(docSnap.id, docSnap.data()))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName)),
    onUpdate,
    onSnapshotError("vehicle_classes", onUpdate)
  );
}

async function parseApiError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // ignore
  }
  throw new Error(message);
}

export async function saveVehicleClass(vehicleClass: VehicleClass): Promise<void> {
  validateVehicleClass(vehicleClass);
  const res = await fetch("/api/vehicle-classes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...vehicleClass, branchId: getActiveBranchId() })
  });
  if (!res.ok) {
    await parseApiError(res, "Could not save vehicle class.");
  }
}

export async function deleteVehicleClass(id: string): Promise<void> {
  const res = await fetch(`/api/vehicle-classes/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchId: getActiveBranchId() })
  });
  if (!res.ok) {
    await parseApiError(res, "Could not delete vehicle class.");
  }
}

export async function fetchOperatingHours(
  branchId: string = getActiveBranchId()
): Promise<AppFleetOperatingHours> {
  const nested = await getDoc(
    branchSettingsDocRef(db(), BranchSettingsDocs.operatingHours, branchId)
  );
  return nested.exists() ? mapOperatingHours(nested.data()) : emptyOperatingHours;
}

export async function saveOperatingHours(
  hours: AppFleetOperatingHours,
  branchId: string = getActiveBranchId()
): Promise<void> {
  await setDoc(
    branchSettingsDocRef(db(), BranchSettingsDocs.operatingHours, branchId),
    stripUndefined({ ...hours }),
    { merge: true }
  );
  void createActivityNotification(operatingHoursNotification());
}

export async function fetchOperatorLocale(): Promise<OperatorLocale> {
  const snap = await getDoc(doc(db(), Collections.appSettings, AppSettingsDocs.locale));
  if (!snap.exists()) throw new ConfigError("Locale is not configured.");
  return mapOperatorLocale(snap.data());
}

export async function saveOperatorLocale(locale: OperatorLocale): Promise<void> {
  validateOperatorLocale(locale);
  await setDoc(
    doc(db(), Collections.appSettings, AppSettingsDocs.locale),
    stripUndefined({ ...locale })
  );
  invalidateOperatorLocaleCache();
  void createActivityNotification(localeNotification());
}

export async function fetchCompanyProfile(): Promise<CompanyProfile> {
  const snap = await getDoc(doc(db(), Collections.appSettings, AppSettingsDocs.company));
  return snap.exists() ? mapCompanyProfile(snap.data()) : emptyCompanyProfile;
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<void> {
  await setDoc(
    doc(db(), Collections.appSettings, AppSettingsDocs.company),
    stripUndefined({ ...profile }),
    { merge: true }
  );
  void createActivityNotification(companyNotification());
}

export async function fetchGlobalLimits(): Promise<AppGlobalLimits> {
  const snap = await getDoc(doc(db(), Collections.appSettings, AppSettingsDocs.limits));
  return snap.exists() ? mapLimits(snap.data()) : unlimitedLimits;
}

export async function saveGlobalLimits(limits: AppGlobalLimits): Promise<void> {
  await setDoc(doc(db(), Collections.appSettings, AppSettingsDocs.limits), stripUndefined({ ...limits }), {
    merge: true
  });
}

// ─────────────────────────────── Invoices ───────────────────────────────

export function listenInvoices(onUpdate: (invoices: Invoice[]) => void): Unsub {
  const branchId = getActiveBranchId();
  const nested = query(
    branchCollectionRef(db(), "invoices", branchId),
    orderBy("issuedAt", "desc")
  );
  return listenQuery(
    nested,
    (snap) => snapToList(snap, mapInvoice),
    onUpdate,
    onSnapshotError("invoices", onUpdate)
  );
}

export async function fetchInvoice(id: string): Promise<Invoice | null> {
  const nested = await getDoc(branchDocRef(db(), "invoices", id));
  return nested.exists() ? mapInvoice(nested.id, nested.data()) : null;
}

export async function createInvoice(invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(branchCollectionRef(db(), "invoices"), {
    ...stripUndefined(invoice),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  void createActivityNotification(invoiceNotification("created", invoice.invoiceNumber, ref.id));
  return ref.id;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<void> {
  await updateDoc(branchDocRef(db(), "invoices", id), {
    ...stripUndefined(patch),
    updatedAt: serverTimestamp()
  });
  void createActivityNotification(
    invoiceNotification("updated", patch.invoiceNumber ?? id, id)
  );
}

export async function deleteInvoice(id: string): Promise<void> {
  const ref = branchDocRef(db(), "invoices", id);
  const snap = await getDoc(ref);
  const number = snap.exists() ? String(snap.data().invoiceNumber ?? id) : id;
  await deleteDoc(ref);
  void createActivityNotification(invoiceNotification("deleted", number, id));
}

export async function fetchSettingDoc<T extends DocumentData>(docId: string): Promise<T | null> {
  const snap = await getDoc(doc(db(), Collections.appSettings, docId));
  return snap.exists() ? (snap.data() as T) : null;
}

/** Merges data into an `app_settings/{docId}` document. */
export async function saveSettingDoc(docId: string, data: DocumentData): Promise<void> {
  await setDoc(doc(db(), Collections.appSettings, docId), stripUndefined({ ...data }), { merge: true });
}
