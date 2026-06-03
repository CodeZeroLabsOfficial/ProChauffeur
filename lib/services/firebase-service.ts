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
import { firestore } from "@/lib/firebase/client";
import { coordinateToGeoPoint, stripUndefined } from "@/lib/firebase/converters";
import {
  AppSettingsDocs,
  Collections,
  defaultPricingConfig,
  emptyCompanyProfile,
  emptyOperatingHours,
  unlimitedLimits,
  type CompanyProfile,
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
  mapCompanyProfile,
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

export async function updateUserDriverProfile(uid: string, driverProfile: DriverProfile): Promise<void> {
  await updateDoc(doc(db(), Collections.users, uid), {
    driverProfile: stripUndefined({ ...driverProfile })
  });
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
  await setDoc(doc(db(), Collections.vehicles, vehicle.driverID), stripUndefined({ ...vehicle }));
}

export async function deleteVehicle(driverID: string): Promise<void> {
  await deleteDoc(doc(db(), Collections.vehicles, driverID));
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
}

export async function deleteFleetLocation(id: string): Promise<void> {
  await deleteDoc(doc(db(), Collections.locations, id));
}

// ───────────────────────── App settings (config) ─────────────────────

export async function fetchPricingConfiguration(): Promise<PricingConfig> {
  const snap = await getDoc(doc(db(), Collections.appSettings, AppSettingsDocs.pricing));
  return snap.exists() ? mapPricingConfig(snap.data()) : defaultPricingConfig;
}

export async function savePricingConfiguration(config: PricingConfig): Promise<void> {
  await setDoc(doc(db(), Collections.appSettings, AppSettingsDocs.pricing), config);
}

export async function fetchOperatingHours(): Promise<AppFleetOperatingHours> {
  const snap = await getDoc(doc(db(), Collections.appSettings, AppSettingsDocs.operatingHours));
  return snap.exists() ? mapOperatingHours(snap.data()) : emptyOperatingHours;
}

export async function saveOperatingHours(hours: AppFleetOperatingHours): Promise<void> {
  await setDoc(doc(db(), Collections.appSettings, AppSettingsDocs.operatingHours), stripUndefined({ ...hours }));
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
  return ref.id;
}

export async function updateInvoice(id: string, patch: Partial<Invoice>): Promise<void> {
  await updateDoc(doc(db(), Collections.invoices, id), {
    ...stripUndefined({ ...patch }),
    updatedAt: serverTimestamp()
  });
}

export async function deleteInvoice(id: string): Promise<void> {
  await deleteDoc(doc(db(), Collections.invoices, id));
}

// ─────────────────── Generic app_settings docs (web) ─────────────────

/** Reads an arbitrary `app_settings/{docId}` document (branding, locale, etc). */
export async function fetchSettingDoc<T extends DocumentData>(docId: string): Promise<T | null> {
  const snap = await getDoc(doc(db(), Collections.appSettings, docId));
  return snap.exists() ? (snap.data() as T) : null;
}

/** Merges data into an `app_settings/{docId}` document. */
export async function saveSettingDoc(docId: string, data: DocumentData): Promise<void> {
  await setDoc(doc(db(), Collections.appSettings, docId), stripUndefined({ ...data }), { merge: true });
}
