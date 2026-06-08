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
  OperatorDocs,
  defaultPricingConfig,
  emptyCompanyProfile,
  emptyOperatingHours,
  emptyOperatorLocale,
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
  type UserProfile,
  type UserRole,
  type Vehicle
} from "@/lib/models";
import {
  mapActivityNotification,
  mapCompanyProfile,
  mapOperatorLocale,
  mapFleetLocation,
  mapInvoice,
  mapLimits,
  mapOperatingHours,
  mapPricingConfig,
  mapTrip,
  mapUser,
  mapVehicle
} from "@/lib/services/mappers";

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

// ─────────────────────────────── Trips ───────────────────────────────

/** Admin overview listener: recent trips across the fleet, newest first. */
export function listenTrips(onUpdate: (trips: Trip[]) => void, max = 800): Unsub {
  const q = query(collection(db(), Collections.trips), orderBy("createdAt", "desc"), fsLimit(max));
  return onSnapshot(
    q,
    (snap) => onUpdate(snapToList(snap, mapTrip)),
    onSnapshotError("trips", onUpdate)
  );
}

export async function fetchTrips(max = 800): Promise<Trip[]> {
  const q = query(collection(db(), Collections.trips), orderBy("createdAt", "desc"), fsLimit(max));
  return snapToList(await getDocs(q), mapTrip);
}

export async function fetchTrip(id: string): Promise<Trip | null> {
  const snap = await getDoc(doc(db(), Collections.trips, id));
  return snap.exists() ? mapTrip(snap.id, snap.data()) : null;
}

/** Realtime listener for a single trip document. */
export function listenTrip(id: string, onUpdate: (trip: Trip | null) => void): Unsub {
  return onSnapshot(
    doc(db(), Collections.trips, id),
    (snap) => onUpdate(snap.exists() ? mapTrip(snap.id, snap.data()) : null),
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
    body: JSON.stringify({ status })
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
  fleetVehicleDocumentId?: string | null,
  vehicleSnapshot?: Vehicle | null
): Promise<void> {
  await updateDoc(
    doc(db(), Collections.trips, id),
    stripUndefined({
      driverID,
      fleetVehicleDocumentId: driverID ? fleetVehicleDocumentId : null,
      vehicleSnapshot: driverID ? vehicleSnapshot : null,
      updatedAt: serverTimestamp()
    })
  );
}

export async function updateTrip(id: string, patch: Partial<Trip>): Promise<void> {
  await updateDoc(
    doc(db(), Collections.trips, id),
    stripUndefined({
      ...patch,
      pickup: patch.pickup ? coordinateToFirestoreField(patch.pickup) : undefined,
      dropoff: patch.dropoff ? coordinateToFirestoreField(patch.dropoff) : undefined,
      updatedAt: serverTimestamp()
    })
  );
}

export async function createTrip(trip: Trip): Promise<void> {
  const now = new Date();
  const payload = stripUndefined({
    ...trip,
    pickup: coordinateToFirestoreField(trip.pickup),
    dropoff: coordinateToFirestoreField(trip.dropoff),
    liveLocation: trip.liveLocation ? coordinateToGeoPoint(trip.liveLocation) : undefined,
    createdAt: trip.createdAt ?? now,
    updatedAt: trip.updatedAt ?? now
  });
  await setDoc(doc(db(), Collections.trips, trip.id), payload);
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
  address?: string;
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

export async function updateUserEmail(uid: string, email: string): Promise<void> {
  await updateDoc(doc(db(), Collections.users, uid), { email: email.trim() });
}

export async function uploadUserProfilePhoto(_uid: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
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
  const vehicleRef = doc(db(), Collections.vehicles, uid);
  const vehicleSnap = await getDoc(vehicleRef);
  if (vehicleSnap.exists()) {
    await deleteVehicle(uid);
  }
  await updateDoc(doc(db(), Collections.users, uid), {
    role: "customer",
    driverProfile: deleteField()
  });
  void createActivityNotification(driverNotification("deleted", driverTitle ?? "Chauffeur", uid));
}

// ────────────────────────────── Vehicles ─────────────────────────────

export function listenVehicles(onUpdate: (vehicles: Vehicle[]) => void): Unsub {
  return onSnapshot(
    collection(db(), Collections.vehicles),
    (snap) => {
      const rows = snapToList(snap, (_, d) => mapVehicle(d));
      rows.sort((a, b) =>
        `${a.color} ${a.make} ${a.model}`.localeCompare(`${b.color} ${b.make} ${b.model}`)
      );
      onUpdate(rows);
    },
    onSnapshotError("vehicles", onUpdate)
  );
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const snap = await getDocs(collection(db(), Collections.vehicles));
  return snap.docs.map((dc) => mapVehicle(dc.data()));
}

/** Vehicle doc id always equals driverID. */
export async function fetchVehicle(vehicleDocumentId: string): Promise<Vehicle | null> {
  const snap = await getDoc(doc(db(), Collections.vehicles, vehicleDocumentId));
  return snap.exists() ? mapVehicle(snap.data()) : null;
}

/** Vehicle doc id always equals driverID (chauffeur uid). */
export async function upsertVehicle(vehicle: Vehicle): Promise<void> {
  const ref = doc(db(), Collections.vehicles, vehicle.driverID);
  const existing = await getDoc(ref);
  const action = existing.exists() ? "updated" : "created";
  await setDoc(ref, stripUndefined({ ...vehicle }));
  void createActivityNotification(
    vehicleNotification(action, vehicleDisplayTitle(vehicle), vehicle.driverID)
  );
}

export async function deleteVehicle(driverID: string): Promise<void> {
  const ref = doc(db(), Collections.vehicles, driverID);
  const snap = await getDoc(ref);
  const title = snap.exists() ? vehicleDisplayTitle(mapVehicle(snap.data())) : "Fleet vehicle";
  await deleteDoc(ref);
  void createActivityNotification(vehicleNotification("deleted", title, driverID));
}

/** Assign a fleet vehicle to a chauffeur, clearing prior links (mirrors iOS). */
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
      batch.update(doc(db(), Collections.vehicles, v.driverID), { assignedChauffeurUserId: "" });
    }
  }
  if (!found) throw new Error("That fleet vehicle no longer exists. Refresh and try again.");
  batch.update(doc(db(), Collections.vehicles, vehicleDocumentId), {
    assignedChauffeurUserId: toChauffeurUserId
  });
  await batch.commit();
}

/** Clears the chauffeur linked to a fleet vehicle. */
export async function unassignFleetVehicle(vehicleDocumentId: string): Promise<void> {
  await updateDoc(doc(db(), Collections.vehicles, vehicleDocumentId), {
    assignedChauffeurUserId: ""
  });
}

// ───────────────────────────── Locations ─────────────────────────────

export function listenFleetLocations(onUpdate: (locations: FleetLocation[]) => void): Unsub {
  const q = query(collection(db(), Collections.locations), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onUpdate(snapToList(snap, mapFleetLocation)),
    onSnapshotError("locations", onUpdate)
  );
}

async function clearOtherDefaultFleetLocations(exceptId: string): Promise<void> {
  const snap = await getDocs(collection(db(), Collections.locations));
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
  if (!name || !addressLine) throw new Error("Enter a name and address before saving this location.");
  const id = crypto.randomUUID();
  const isDefault = input.isDefault === true;

  if (isDefault) await clearOtherDefaultFleetLocations(id);

  await setDoc(doc(db(), Collections.locations, id), {
    id,
    name,
    addressLine,
    latitude: input.latitude,
    longitude: input.longitude,
    ...(isDefault ? { isDefault: true } : {}),
    createdAt: serverTimestamp()
  });
  void createActivityNotification(locationNotification("created", name, id));
}

export async function updateFleetLocation(location: FleetLocation): Promise<void> {
  const name = location.name.trim();
  const addressLine = location.addressLine.trim();
  if (!name || !addressLine) throw new Error("Enter a name and address before saving this location.");
  const isDefault = location.isDefault === true;

  if (isDefault) await clearOtherDefaultFleetLocations(location.id);

  await updateDoc(doc(db(), Collections.locations, location.id), {
    name,
    addressLine,
    latitude: location.latitude,
    longitude: location.longitude,
    isDefault
  });
  void createActivityNotification(locationNotification("updated", name, location.id));
}

export async function deleteFleetLocation(id: string): Promise<void> {
  const ref = doc(db(), Collections.locations, id);
  const snap = await getDoc(ref);
  const title = snap.exists() ? mapFleetLocation(snap.id, snap.data()).name : "Location";
  await deleteDoc(ref);
  void createActivityNotification(locationNotification("deleted", title, id));
}

// ───────────────────────── App settings (config) ─────────────────────

export async function fetchPricingConfiguration(): Promise<PricingConfig> {
  const snap = await getDoc(doc(db(), Collections.appSettings, AppSettingsDocs.pricing));
  return snap.exists() ? mapPricingConfig(snap.data()) : defaultPricingConfig;
}

export async function savePricingConfiguration(config: PricingConfig): Promise<void> {
  await setDoc(doc(db(), Collections.appSettings, AppSettingsDocs.pricing), config);
  void createActivityNotification(pricingNotification());
}

export async function fetchOperatingHours(): Promise<AppFleetOperatingHours> {
  const snap = await getDoc(doc(db(), Collections.operator, OperatorDocs.operatingHours));
  return snap.exists() ? mapOperatingHours(snap.data()) : emptyOperatingHours;
}

export async function saveOperatingHours(hours: AppFleetOperatingHours): Promise<void> {
  await setDoc(
    doc(db(), Collections.operator, OperatorDocs.operatingHours),
    stripUndefined({ ...hours }),
    { merge: true }
  );
  void createActivityNotification(operatingHoursNotification());
}

export async function fetchOperatorLocale(): Promise<OperatorLocale> {
  const snap = await getDoc(doc(db(), Collections.operator, OperatorDocs.locale));
  return snap.exists() ? mapOperatorLocale(snap.data()) : emptyOperatorLocale;
}

export async function saveOperatorLocale(locale: OperatorLocale): Promise<void> {
  await setDoc(
    doc(db(), Collections.operator, OperatorDocs.locale),
    stripUndefined({ ...locale }),
    { merge: true }
  );
  void createActivityNotification(localeNotification());
}

export async function fetchCompanyProfile(): Promise<CompanyProfile> {
  const snap = await getDoc(doc(db(), Collections.operator, OperatorDocs.company));
  return snap.exists() ? mapCompanyProfile(snap.data()) : emptyCompanyProfile;
}

export async function saveCompanyProfile(profile: CompanyProfile): Promise<void> {
  await setDoc(
    doc(db(), Collections.operator, OperatorDocs.company),
    stripUndefined({ ...profile }),
    { merge: true }
  );
  void createActivityNotification(companyNotification(profile.name?.trim() || "Company"));
}

export async function fetchGlobalLimits(): Promise<AppGlobalLimits> {
  const snap = await getDoc(doc(db(), Collections.appSettings, AppSettingsDocs.limits));
  return snap.exists() ? mapLimits(snap.data()) : unlimitedLimits;
}

export async function saveGlobalLimits(limits: AppGlobalLimits): Promise<void> {
  await setDoc(doc(db(), Collections.appSettings, AppSettingsDocs.limits), limits);
}

// ───────────────────────────── Invoices ──────────────────────────────

export function listenInvoices(onUpdate: (invoices: Invoice[]) => void): Unsub {
  const q = query(collection(db(), Collections.invoices), orderBy("issuedAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onUpdate(snapToList(snap, mapInvoice)),
    onSnapshotError("invoices", onUpdate)
  );
}

export async function fetchInvoice(id: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db(), Collections.invoices, id));
  return snap.exists() ? mapInvoice(snap.id, snap.data()) : null;
}

export async function createInvoice(invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(collection(db(), Collections.invoices), {
    ...stripUndefined({ ...invoice }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await updateDoc(ref, { id: ref.id });
  const title = invoice.invoiceNumber?.trim() || "Invoice";
  void createActivityNotification(invoiceNotification("created", title, ref.id));
  return ref.id;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<void> {
  await updateDoc(doc(db(), Collections.invoices, id), {
    ...stripUndefined({ ...patch }),
    updatedAt: serverTimestamp()
  });
  const title = patch.invoiceNumber?.trim() || "Invoice";
  void createActivityNotification(invoiceNotification("updated", title, id));
}

export async function deleteInvoice(id: string): Promise<void> {
  const ref = doc(db(), Collections.invoices, id);
  const snap = await getDoc(ref);
  const title = snap.exists() ? mapInvoice(snap.id, snap.data()).invoiceNumber || "Invoice" : "Invoice";
  await deleteDoc(ref);
  void createActivityNotification(invoiceNotification("deleted", title, id));
}

// ─────────────────── Generic app_settings docs (web) ─────────────────

/** Reads an arbitrary `app_settings/{docId}` document (branding, integrations, etc). */
export async function fetchSettingDoc<T extends DocumentData>(docId: string): Promise<T | null> {
  const snap = await getDoc(doc(db(), Collections.appSettings, docId));
  return snap.exists() ? (snap.data() as T) : null;
}

/** Merges data into an `app_settings/{docId}` document. */
export async function saveSettingDoc(docId: string, data: DocumentData): Promise<void> {
  await setDoc(doc(db(), Collections.appSettings, docId), stripUndefined({ ...data }), { merge: true });
}
