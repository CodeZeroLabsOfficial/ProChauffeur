"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
import { coordinateToGeoPoint, stripUndefined } from "@/lib/firebase/converters";
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
  await updateDoc(doc(db(), Collections.trips, id), {
    status,
    updatedAt: serverTimestamp()
  });
}

export async function assignTripDriver(
  id: string,
  driverID: string,
  fleetVehicleDocumentId?: string
): Promise<void> {
  await updateDoc(
    doc(db(), Collections.trips, id),
    stripUndefined({ driverID, fleetVehicleDocumentId, updatedAt: serverTimestamp() })
  );
}

export async function createTrip(trip: Trip): Promise<void> {
  const payload = stripUndefined({
    ...trip,
    pickup: coordinateToGeoPoint(trip.pickup),
    dropoff: coordinateToGeoPoint(trip.dropoff),
    liveLocation: trip.liveLocation ? coordinateToGeoPoint(trip.liveLocation) : undefined,
    updatedAt: serverTimestamp(),
    createdAt: trip.createdAt ?? serverTimestamp()
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

export async function updateUserProfile(uid: string, profile: UserProfile): Promise<void> {
  await updateDoc(doc(db(), Collections.users, uid), { profile: stripUndefined({ ...profile }) });
  const title = profile.displayName?.trim() || "Profile";
  void createActivityNotification(profileNotification(title, uid));
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

// ───────────────────────────── Locations ─────────────────────────────

export function listenFleetLocations(onUpdate: (locations: FleetLocation[]) => void): Unsub {
  const q = query(collection(db(), Collections.locations), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => onUpdate(snapToList(snap, mapFleetLocation)),
    onSnapshotError("locations", onUpdate)
  );
}

export async function createFleetLocation(input: {
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
}): Promise<void> {
  const name = input.name.trim();
  const addressLine = input.addressLine.trim();
  if (!name || !addressLine) throw new Error("Enter a name and address before saving this location.");
  const id = crypto.randomUUID();
  await setDoc(doc(db(), Collections.locations, id), {
    id,
    name,
    addressLine,
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt: serverTimestamp()
  });
  void createActivityNotification(locationNotification("created", name, id));
}

export async function updateFleetLocation(location: FleetLocation): Promise<void> {
  const name = location.name.trim();
  const addressLine = location.addressLine.trim();
  if (!name || !addressLine) throw new Error("Enter a name and address before saving this location.");
  await updateDoc(doc(db(), Collections.locations, location.id), {
    name,
    addressLine,
    latitude: location.latitude,
    longitude: location.longitude
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
