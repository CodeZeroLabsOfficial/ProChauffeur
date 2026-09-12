"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  deleteField,
  getDoc,
  getDocs,
  increment,
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
import { remove, ref as rtdbRef } from "firebase/database";

import { firestore, firebaseAuth, realtimeDb } from "@/lib/firebase/client";
import {
  coordinateToFirestoreField,
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
  featuresNotification,
  localeNotification,
  locationNotification,
  operatingHoursNotification,
  pricingNotification,
  profileNotification,
  serviceAreaNotification,
  vehicleClassesNotification,
  vehicleDisplayTitle,
  vehicleNotification
} from "@/lib/notifications/messages";
import {
  AppSettingsDocs,
  Collections,
  emptyCompanyProfile,
  emptyOperatingHours,
  LICENSE_NOT_CONFIGURED_MESSAGE,
  PLANS_NOT_CONFIGURED_MESSAGE,
  isFeatureEnabled,
  type ActivityNotification,
  type CompanyProfile,
  type CreateActivityNotificationInput,
  type OperatorLocale,
  type AppFleetOperatingHours,
  type AppLicense,
  type AppPlansCatalog,
  type DriverProfile,
  type FleetLocation,
  type Invoice,
  type PricingConfig,
  type Promotion,
  type SavedPaymentMethod,
  type Trip,
  type TripStatus,
  type User,
  type UserPreferences,
  type UserProfile,
  type Vehicle,
  type VehicleClass,
  type CorporateAccount,
  effectiveChauffeurUserId,
  vehicleDisplayName
} from "@/lib/models";
import {
  mapActivityNotification,
  mapBranch,
  mapBranchDriver,
  mapCompanyProfile,
  mapCorporateAccount,
  mapOperatorLocale,
  mapFleetLocation,
  mapInvoice,
  mapLicense,
  mapOperatingHours,
  mapPlansCatalog,
  mapPricingConfig,
  mapPromotion,
  mapSavedPaymentMethod,
  mapTrip,
  mapUser,
  mapVehicle,
  mapVehicleClass
} from "@/lib/services/mappers";
import { ConfigError } from "@/lib/pricing/errors";
import {
  validateOperatorLocale,
  validatePricingConfig,
  validateVehicleClass
} from "@/lib/pricing/validate";
import { getActiveBranchId, setActiveBranchId } from "@/lib/branch/active-branch-store";
import { requireBranchId } from "@/lib/branch/require-branch-id";
import { setActiveFormatLocale } from "@/lib/locale/active-format-locale";
import {
  branchCollectionRef,
  branchDocRef,
  branchMetaDocRef,
  branchSettingsDocRef,
  branchesCollectionRef
} from "@/lib/branch/firestore-paths";
import { listenQuery } from "@/lib/branch/listen-query";
import {
  BRANCH_SUBCOLLECTIONS,
  BranchSettingsDocs,
  BRANCH_OFFICE_FLEET_LOCATION_ID,
  type Branch,
  type BranchDriver
} from "@/lib/models/branch";
import {
  canAddDriver,
  canCreateLocation,
  clampPreferredPayment,
  normalizeAllowedPaymentMethods,
  normalizeAllowedVehicleClassIds,
  normalizeCorporateJoinCode,
  normalizePromoCode,
  rtdbBranchLiveTripsPath
} from "@/lib/models";

type Unsub = () => void;

function db() {
  return firestore();
}

let licensePromise: Promise<AppLicense> | null = null;
let plansCatalogPromise: Promise<AppPlansCatalog> | null = null;

function snapToList<T>(
  snap: QuerySnapshot<DocumentData>,
  map: (id: string, d: DocumentData) => T
): T[] {
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

async function notifyLocationSetting(
  branchId: string,
  build: (locationName: string) => CreateActivityNotificationInput
): Promise<void> {
  try {
    const branch = await fetchBranch(branchId);
    const locationName = branch?.name?.trim() || branchId;
    await createActivityNotification(build(locationName));
  } catch (err) {
    console.error("Failed to write activity notification:", err);
  }
}

/** Best-effort activity notification write; never throws to callers. */
export async function createActivityNotification(
  input: CreateActivityNotificationInput
): Promise<void> {
  try {
    const actor = await resolveActor();
    await addDoc(
      collection(db(), Collections.notifications),
      stripUndefined({
        ...input,
        actorId: input.actorId ?? actor.actorId,
        actorName: input.actorName ?? actor.actorName,
        readAt: null,
        createdAt: serverTimestamp()
      })
    );
  } catch (err) {
    console.error("Failed to write activity notification:", err);
  }
}

export function listenNotifications(
  onUpdate: (rows: ActivityNotification[]) => void,
  max = 50
): Unsub {
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

/** Per-document snapshots for staff who cannot list the whole `branches` collection. */
export function listenGrantedBranches(
  ids: string[],
  onUpdate: (branches: Branch[]) => void
): Unsub {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) {
    onUpdate([]);
    return () => {};
  }

  const byId = new Map<string, Branch>();
  const ready = new Set<string>();

  function emitIfReady() {
    if (ready.size !== unique.length) return;
    onUpdate([...byId.values()]);
  }

  const unsubs = unique.map((id) =>
    onSnapshot(
      branchMetaDocRef(db(), id),
      (snap) => {
        if (snap.exists()) byId.set(id, mapBranch(snap.id, snap.data()));
        else byId.delete(id);
        ready.add(id);
        emitIfReady();
      },
      (error) => {
        console.error(`Firestore branches/${id} listener failed:`, error.code, error.message);
        byId.delete(id);
        ready.add(id);
        emitIfReady();
      }
    )
  );

  return () => {
    for (const unsub of unsubs) unsub();
  };
}

export async function fetchBranches(): Promise<Branch[]> {
  return snapToList(await getDocs(branchesCollectionRef(db())), mapBranch);
}

export async function fetchBranch(branchId: string): Promise<Branch | null> {
  const snap = await getDoc(branchMetaDocRef(db(), branchId));
  return snap.exists() ? mapBranch(snap.id, snap.data()) : null;
}

export type BranchUpsertActivity = "features" | "service-area";

export async function upsertBranch(
  branch: Branch,
  activity?: BranchUpsertActivity
): Promise<void> {
  const ref = branchMetaDocRef(db(), branch.id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    const license = await fetchLicense();
    const current = await fetchBranches();
    if (!canCreateLocation(current.length, license.maxLocations)) {
      throw new Error(
        `Location limit reached (${license.maxLocations}). Raise maxLocations in License settings or remove a location.`
      );
    }
  }
  await setDoc(
    ref,
    stripUndefined({
      id: branch.id,
      name: branch.name,
      isActive: branch.isActive,
      timeZoneIdentifier: deleteField(),
      imageUrl: branch.imageUrl ?? null,
      officeAddressLine: branch.officeAddressLine ?? null,
      officeLatitude: branch.officeLatitude ?? null,
      officeLongitude: branch.officeLongitude ?? null,
      officePhone: branch.officePhone ?? null,
      officeEmail: branch.officeEmail ?? null,
      contactUserId: branch.contactUserId ?? null,
      serviceArea: branch.serviceArea ?? null,
      autoDispatchEnabled: branch.autoDispatchEnabled === true,
      dynamicPricingEnabled: branch.dynamicPricingEnabled === true,
      bookingValidationEnabled: branch.bookingValidationEnabled === true,
      createdAt: existing.exists() ? branch.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp()
    }),
    { merge: true }
  );
  if (activity === "features") {
    void notifyLocationSetting(branch.id, (name) => featuresNotification(branch.id, name));
  } else if (activity === "service-area") {
    void notifyLocationSetting(branch.id, (name) => serviceAreaNotification(branch.id, name));
  }
}

export type OfficeFleetSyncInput = {
  name: string;
  addressLine: string;
  latitude: number;
  longitude: number;
};

/**
 * Upserts the default FleetLocation used for quoting from the Location office.
 * Doc id is always `office` under the branch.
 */
export async function syncOfficeFleetLocation(
  branchId: string,
  office: OfficeFleetSyncInput
): Promise<void> {
  const resolved = requireBranchId(branchId);
  const addressLine = office.addressLine.trim();
  if (!addressLine) return;
  if (!Number.isFinite(office.latitude) || !Number.isFinite(office.longitude)) {
    throw new Error("Select an office address from the suggestions.");
  }

  await clearOtherDefaultFleetLocationsInBranch(resolved, BRANCH_OFFICE_FLEET_LOCATION_ID);

  const ref = branchDocRef(db(), "locations", BRANCH_OFFICE_FLEET_LOCATION_ID, resolved);
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
      timeZoneIdentifier: deleteField(),
      createdAt: existing.exists()
        ? (existing.data()?.createdAt ?? serverTimestamp())
        : serverTimestamp()
    }),
    { merge: true }
  );
}

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
  /** Present during invite onboarding so the API can gate Mapbox + invite. */
  token?: string;
};

/** Creates a Location from the chosen country seed file (Admin API). */
export async function createLocationFromSeed(
  input: CreateLocationFromSeedInput
): Promise<Branch> {
  const res = await fetch("/api/locations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    await parseApiError(res, "Could not create the location.");
  }
  const body = (await res.json()) as { branch: Branch & { createdAt: string; updatedAt: string } };
  const created: Branch = {
    ...body.branch,
    createdAt: new Date(body.branch.createdAt),
    updatedAt: new Date(body.branch.updatedAt)
  };
  if (!input.token) {
    void createActivityNotification(locationNotification("created", created.name, created.id));
  }
  return created;
}

async function deleteCollectionInBatches(colRef: ReturnType<typeof collection>): Promise<void> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await getDocs(query(colRef, fsLimit(400)));
    if (snap.empty) break;
    const batch = writeBatch(db());
    for (const docSnap of snap.docs) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
}

/**
 * Deletes a Location (branch) and all nested ops data under `branches/{id}/`,
 * clears RTDB live positions for that branch, and removes cross-references
 * on users and promotions.
 */
export async function deleteBranch(branchId: string): Promise<void> {
  const id = branchId.trim();
  if (!id) throw new Error("Location id is required.");

  const existing = await getDoc(branchMetaDocRef(db(), id));
  if (!existing.exists()) return;

  const siblings = await fetchBranches();
  if (siblings.length <= 1) {
    throw new Error("Cannot delete the only location.");
  }

  for (const sub of BRANCH_SUBCOLLECTIONS) {
    await deleteCollectionInBatches(collection(db(), "branches", id, sub));
  }

  await deleteDoc(branchMetaDocRef(db(), id));

  try {
    await remove(rtdbRef(realtimeDb(), rtdbBranchLiveTripsPath(id)));
  } catch (err) {
    console.error("Failed to clear live trip locations for deleted branch:", err);
  }

  const remaining = siblings.filter((b) => b.id !== id);
  const fallbackId = remaining[0]?.id ?? "";
  if (getActiveBranchId() === id) {
    setActiveBranchId(fallbackId);
  }

  const usersSnap = await getDocs(collection(db(), Collections.users));
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const homeBranchId = typeof data.homeBranchId === "string" ? data.homeBranchId : null;
    const defaultBranchId = typeof data.defaultBranchId === "string" ? data.defaultBranchId : null;
    const branchIds = Array.isArray(data.branchIds)
      ? (data.branchIds as unknown[]).filter((v): v is string => typeof v === "string")
      : null;

    const nextBranchIds = branchIds?.includes(id)
      ? branchIds.filter((bid) => bid !== id)
      : branchIds;
    const patch: Record<string, unknown> = {};

    if (homeBranchId === id) {
      patch.homeBranchId = nextBranchIds?.[0] ?? fallbackId;
    }
    if (defaultBranchId === id) {
      patch.defaultBranchId = nextBranchIds?.[0] ?? fallbackId;
    }
    if (branchIds?.includes(id)) {
      patch.branchIds = nextBranchIds?.length ? nextBranchIds : null;
    }

    if (Object.keys(patch).length > 0) {
      await updateDoc(userDoc.ref, patch);
    }
  }

  const promotions = await fetchPromotions();
  for (const promo of promotions) {
    const ids = promo.conditions.branchIds;
    if (!ids?.includes(id)) continue;
    const nextIds = ids.filter((bid) => bid !== id);
    await savePromotion({
      ...promo,
      conditions: {
        ...promo.conditions,
        branchIds: nextIds.length ? nextIds : null
      }
    });
  }

  invalidatePricingConfigurationCache(id);
  invalidateOperatorLocaleCache(id);
}

// ─────────────────────────────── Trips ───────────────────────────────

/** Admin overview listener: recent trips for a Location, newest first. */
export function listenTrips(
  onUpdate: (trips: Trip[]) => void,
  branchId: string,
  max = 800
): Unsub {
  const id = requireBranchId(branchId);
  const nested = query(
    branchCollectionRef(db(), "trips", id),
    orderBy("createdAt", "desc"),
    fsLimit(max)
  );
  return listenQuery(
    nested,
    (snap) => snap.docs.map((dc) => mapTrip(dc.id, dc.data(), id)),
    onUpdate,
    onSnapshotError("trips", onUpdate)
  );
}

export async function fetchTrips(branchId: string, max = 800): Promise<Trip[]> {
  const id = requireBranchId(branchId);
  const nested = query(
    branchCollectionRef(db(), "trips", id),
    orderBy("createdAt", "desc"),
    fsLimit(max)
  );
  const snap = await getDocs(nested);
  return snap.docs.map((dc) => mapTrip(dc.id, dc.data(), id));
}

export async function fetchTrip(id: string, branchId: string): Promise<Trip | null> {
  const resolved = requireBranchId(branchId);
  const nested = await getDoc(branchDocRef(db(), "trips", id, resolved));
  return nested.exists() ? mapTrip(nested.id, nested.data(), resolved) : null;
}

/** Realtime listener for a single trip document. */
export function listenTrip(
  id: string,
  branchId: string,
  onUpdate: (trip: Trip | null) => void
): Unsub {
  const resolved = requireBranchId(branchId);
  return onSnapshot(
    branchDocRef(db(), "trips", id, resolved),
    (snap) => {
      onUpdate(snap.exists() ? mapTrip(snap.id, snap.data(), resolved) : null);
    },
    (error) => {
      console.error("Firestore trip listener failed:", error.code, error.message);
      onUpdate(null);
    }
  );
}

export async function updateTripStatus(
  id: string,
  status: TripStatus,
  branchId: string
): Promise<void> {
  const resolvedBranchId = requireBranchId(branchId);
  const res = await fetch(`/api/trips/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, branchId: resolvedBranchId })
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
  branchId: string,
  driverID: string | null,
  vehicleDocumentId?: string | null,
  vehicleSnapshot?: Vehicle | null
): Promise<void> {
  const resolved = requireBranchId(branchId);
  await updateDoc(
    branchDocRef(db(), "trips", id, resolved),
    stripUndefined({
      driverID,
      "vehicle.vehicleDocumentId": driverID ? vehicleDocumentId : null,
      "vehicle.vehicleSnapshot": driverID ? vehicleSnapshot : null,
      fleetVehicleDocumentId: deleteField(),
      updatedAt: serverTimestamp()
    })
  );
}

export async function updateTrip(
  id: string,
  branchId: string,
  patch: Partial<Trip>
): Promise<void> {
  const resolved = requireBranchId(branchId);
  const journey = patch.journey
    ? stripUndefined({
        ...patch.journey,
        pickup: patch.journey.pickup
          ? coordinateToFirestoreField(patch.journey.pickup)
          : undefined,
        dropoff: patch.journey.dropoff
          ? coordinateToFirestoreField(patch.journey.dropoff)
          : undefined
      })
    : undefined;

  await updateDoc(
    branchDocRef(db(), "trips", id, resolved),
    stripUndefined({
      ...patch,
      journey,
      updatedAt: serverTimestamp()
    })
  );
}

function tripFirestorePayload(trip: Trip): Record<string, unknown> {
  const now = new Date();
  const branchId = requireBranchId(trip.branchId);
  return stripUndefined({
    id: trip.id,
    status: trip.status,
    customerID: trip.customerID,
    driverID: trip.driverID,
    branchId,
    customer: trip.customer,
    driver: trip.driver,
    capacity: trip.capacity,
    journey: {
      ...trip.journey,
      pickup: coordinateToFirestoreField(trip.journey.pickup),
      dropoff: coordinateToFirestoreField(trip.journey.dropoff)
    },
    quote: trip.quote,
    billing: trip.billing,
    vehicle: trip.vehicle,
    createdAt: trip.createdAt ?? now,
    updatedAt: trip.updatedAt ?? now
  });
}

export async function createTrip(trip: Trip): Promise<void> {
  const branchId = requireBranchId(trip.branchId);
  await setDoc(branchDocRef(db(), "trips", trip.id, branchId), tripFirestorePayload(trip));
  if (trip.quote.appliedPromoId) {
    void incrementPromoRedemption(trip.quote.appliedPromoId);
  }
}

export async function createRoundTripBookings(outbound: Trip, returnLeg: Trip): Promise<void> {
  const outboundBranchId = requireBranchId(outbound.branchId);
  const returnBranchId = requireBranchId(returnLeg.branchId);
  const batch = writeBatch(db());
  batch.set(
    branchDocRef(db(), "trips", outbound.id, outboundBranchId),
    tripFirestorePayload(outbound)
  );
  batch.set(
    branchDocRef(db(), "trips", returnLeg.id, returnBranchId),
    tripFirestorePayload(returnLeg)
  );
  await batch.commit();
  const promoId = outbound.quote.appliedPromoId || returnLeg.quote.appliedPromoId;
  if (promoId) {
    void incrementPromoRedemption(promoId);
  }
}

// ─────────────────────────────── Promotions ───────────────────────────────

export function listenPromotions(onUpdate: (rows: Promotion[]) => void): Unsub {
  return onSnapshot(
    collection(db(), Collections.promotions),
    (snap) => {
      const rows = snapToList(snap, mapPromotion).sort(
        (a, b) => a.title.localeCompare(b.title) || a.code.localeCompare(b.code)
      );
      onUpdate(rows);
    },
    onSnapshotError("promotions", onUpdate)
  );
}

export async function fetchPromotions(): Promise<Promotion[]> {
  const snap = await getDocs(collection(db(), Collections.promotions));
  return snapToList(snap, mapPromotion).sort(
    (a, b) => a.title.localeCompare(b.title) || a.code.localeCompare(b.code)
  );
}

export async function fetchPromotionByCode(code: string): Promise<Promotion | null> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;
  const snap = await getDocs(
    query(collection(db(), Collections.promotions), where("code", "==", normalized), fsLimit(1))
  );
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return mapPromotion(docSnap.id, docSnap.data());
}

export async function countCustomerPromoRedemptions(
  customerId: string,
  promoId: string,
  branchId: string
): Promise<number> {
  if (!customerId.trim() || !promoId.trim()) return 0;
  const id = requireBranchId(branchId);
  const snap = await getDocs(
    query(branchCollectionRef(db(), "trips", id), where("customerID", "==", customerId))
  );
  return snap.docs.filter((docSnap) => docSnap.data()?.quote?.appliedPromoId === promoId).length;
}

export async function savePromotion(promo: Promotion): Promise<void> {
  const code = normalizePromoCode(promo.code);
  if (!code) throw new Error("Promo code is required.");
  if (!promo.title.trim()) throw new Error("Title is required.");
  if (promo.value < 0) throw new Error("Discount value cannot be negative.");
  if (promo.type === "percent" && promo.value > 1) {
    throw new Error("Percent discount must be between 0 and 1 (e.g. 0.25 for 25%).");
  }

  const existing = await fetchPromotions();
  const clash = existing.find(
    (row) => row.id !== promo.id && normalizePromoCode(row.code) === code
  );
  if (clash) throw new Error(`Promo code "${code}" is already in use.`);

  const now = new Date();
  await setDoc(
    doc(db(), Collections.promotions, promo.id),
    stripUndefined({
      id: promo.id,
      title: promo.title.trim(),
      code,
      isEnabled: promo.isEnabled,
      type: promo.type,
      value: promo.value,
      conditions: {
        branchIds: promo.conditions.branchIds?.length ? promo.conditions.branchIds : null,
        startsAt: promo.conditions.startsAt ?? null,
        endsAt: promo.conditions.endsAt ?? null,
        tripTypes: promo.conditions.tripTypes?.length ? promo.conditions.tripTypes : null,
        vehicleClassIds: promo.conditions.vehicleClassIds?.length
          ? promo.conditions.vehicleClassIds
          : null,
        maxRedemptions: promo.conditions.maxRedemptions ?? null,
        perCustomerLimit: promo.conditions.perCustomerLimit ?? null,
        minimumSubtotal: promo.conditions.minimumSubtotal ?? null
      },
      redemptionCount: promo.redemptionCount ?? 0,
      createdAt: promo.createdAt ?? now,
      updatedAt: now
    }),
    { merge: true }
  );
}

export async function deletePromotion(id: string): Promise<void> {
  await deleteDoc(doc(db(), Collections.promotions, id));
}

// ─────────────────────────────── Corporate accounts ───────────────────────────────

async function assertCorporateAccountsEnabled(): Promise<void> {
  const [license, plans] = await Promise.all([fetchLicense(), fetchPlansCatalog()]);
  if (!isFeatureEnabled(license, plans, "corporateAccounts")) {
    throw new Error("Accounts is not enabled on the current license.");
  }
}

export function listenCorporateAccounts(onUpdate: (rows: CorporateAccount[]) => void): Unsub {
  return onSnapshot(
    collection(db(), Collections.corporateAccounts),
    (snap) => {
      const rows = snapToList(snap, mapCorporateAccount).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      onUpdate(rows);
    },
    onSnapshotError("corporateAccounts", onUpdate)
  );
}

export async function fetchCorporateAccounts(): Promise<CorporateAccount[]> {
  const snap = await getDocs(collection(db(), Collections.corporateAccounts));
  return snapToList(snap, mapCorporateAccount).sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchCorporateAccount(id: string): Promise<CorporateAccount | null> {
  if (!id.trim()) return null;
  const snap = await getDoc(doc(db(), Collections.corporateAccounts, id));
  if (!snap.exists()) return null;
  return mapCorporateAccount(snap.id, snap.data());
}

export async function fetchCorporateAccountByJoinCode(
  code: string
): Promise<CorporateAccount | null> {
  const normalized = normalizeCorporateJoinCode(code);
  if (!normalized) return null;
  const snap = await getDocs(
    query(
      collection(db(), Collections.corporateAccounts),
      where("joinCode", "==", normalized),
      fsLimit(1)
    )
  );
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return mapCorporateAccount(docSnap.id, docSnap.data());
}

export async function saveCorporateAccount(account: CorporateAccount): Promise<void> {
  await assertCorporateAccountsEnabled();
  if (!account.name.trim()) throw new Error("Account name is required.");
  if (account.rateMode === "percentOff") {
    const pct = account.percentOff ?? 0;
    if (pct < 0 || pct > 1) {
      throw new Error("Percent off must be between 0 and 1 (e.g. 0.15 for 15%).");
    }
  }
  if (
    typeof account.billingDay === "number" &&
    (account.billingDay < 1 || account.billingDay > 28)
  ) {
    throw new Error("Billing day must be 1–28, or last day of month.");
  }
  if (account.paymentTermsDays < 0) {
    throw new Error("Payment terms cannot be negative.");
  }

  const allowedPaymentMethods = normalizeAllowedPaymentMethods(account.allowedPaymentMethods);
  if (allowedPaymentMethods.length === 0) {
    throw new Error("Select at least one allowed payment method.");
  }
  const preferredPayment = clampPreferredPayment(
    account.preferredPayment ?? null,
    allowedPaymentMethods
  );

  const joinCode = account.joinCode ? normalizeCorporateJoinCode(account.joinCode) : null;
  if (joinCode) {
    const existing = await fetchCorporateAccounts();
    const clash = existing.find(
      (row) => row.id !== account.id && normalizeCorporateJoinCode(row.joinCode ?? "") === joinCode
    );
    if (clash) throw new Error(`Join code "${joinCode}" is already in use.`);
  }

  const now = new Date();
  await setDoc(
    doc(db(), Collections.corporateAccounts, account.id),
    stripUndefined({
      id: account.id,
      name: account.name.trim(),
      logoUrl: account.logoUrl?.trim() || null,
      email: account.email?.trim() || null,
      billingEmail: account.billingEmail?.trim() || null,
      phone: account.phone?.trim() || null,
      taxId: account.taxId?.trim() || null,
      industry: account.industry?.trim() || null,
      addressLine1: account.addressLine1?.trim() || null,
      addressLine2: account.addressLine2?.trim() || null,
      city: account.city?.trim() || null,
      state: account.state?.trim() || null,
      postcode: account.postcode?.trim() || null,
      country: account.country?.trim() || null,
      primaryContactUserId: account.primaryContactUserId?.trim() || null,
      billingContactUserId: account.billingContactUserId?.trim() || null,
      accountManagerUserId: account.accountManagerUserId?.trim() || null,
      allowedVehicleClassIds: normalizeAllowedVehicleClassIds(account.allowedVehicleClassIds),
      maxRideAmount:
        account.maxRideAmount != null && Number.isFinite(account.maxRideAmount)
          ? account.maxRideAmount
          : null,
      monthlyBudget:
        account.monthlyBudget != null && Number.isFinite(account.monthlyBudget)
          ? account.monthlyBudget
          : null,
      allowedPaymentMethods,
      preferredPayment,
      gstInclusive: deleteField(),
      status: account.status,
      billingDay: account.billingDay,
      paymentTermsDays: account.paymentTermsDays,
      rateMode: account.rateMode,
      percentOff: account.rateMode === "percentOff" ? (account.percentOff ?? 0) : null,
      fixedRates: account.rateMode === "fixedRates" ? account.fixedRates : [],
      joinCode,
      creditLimit: account.creditLimit ?? null,
      notes: account.notes?.trim() || null,
      createdAt: account.createdAt ?? now,
      updatedAt: now
    }),
    { merge: true }
  );
}

export async function deleteCorporateAccount(id: string): Promise<void> {
  await assertCorporateAccountsEnabled();
  const members = await fetchCorporateAccountMembers(id);
  if (members.length > 0) {
    throw new Error("Unlink all members before deleting this account.");
  }
  await deleteDoc(doc(db(), Collections.corporateAccounts, id));
}

export async function fetchCorporateAccountMembers(accountId: string): Promise<User[]> {
  if (!accountId.trim()) return [];
  const snap = await getDocs(
    query(
      collection(db(), Collections.users),
      where("corporateAccountId", "==", accountId),
      where("role", "==", "customer")
    )
  );
  return snapToList(snap, mapUser).sort((a, b) =>
    a.profile.displayName.localeCompare(b.profile.displayName)
  );
}

export async function linkCustomerToCorporateAccount(
  userId: string,
  corporateAccountId: string | null
): Promise<void> {
  await assertCorporateAccountsEnabled();
  if (corporateAccountId) {
    const account = await fetchCorporateAccount(corporateAccountId);
    if (!account) throw new Error("Account not found.");
    if (account.status !== "active") {
      throw new Error("Cannot link members to a suspended account.");
    }
  }
  await updateDoc(doc(db(), Collections.users, userId), {
    corporateAccountId: corporateAccountId || deleteField(),
    ...(corporateAccountId ? {} : { preferredPaymentMethod: deleteField() })
  });
}

export async function updateUserPreferredPaymentMethod(
  userId: string,
  preferred: "card" | "corporate" | null
): Promise<void> {
  await updateDoc(doc(db(), Collections.users, userId), {
    preferredPaymentMethod: preferred ?? deleteField()
  });
}

async function incrementPromoRedemption(promoId: string): Promise<void> {
  try {
    await updateDoc(doc(db(), Collections.promotions, promoId), {
      redemptionCount: increment(1),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Failed to increment promo redemption:", err);
  }
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

/** Saved cards under `users/{uid}/payment_methods`. Prefer default, else first. */
export async function fetchDefaultSavedPaymentMethod(
  uid: string
): Promise<SavedPaymentMethod | null> {
  if (!uid.trim()) return null;
  const snap = await getDocs(collection(db(), Collections.users, uid, "payment_methods"));
  const methods = snap.docs.map((d) => mapSavedPaymentMethod(d.id, d.data()));
  return methods.find((m) => m.isDefault) ?? methods[0] ?? null;
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
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
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

export async function uploadBranchImage(branchId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/locations/${encodeURIComponent(branchId)}/image`, {
    method: "POST",
    body: formData
  });
  const body = (await res.json().catch(() => ({}))) as { imageUrl?: string; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Could not upload location image.");
  }
  if (!body.imageUrl) {
    throw new Error("Could not upload location image.");
  }
  return body.imageUrl;
}

export async function uploadCorporateAccountLogo(accountId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/accounts/${encodeURIComponent(accountId)}/logo`, {
    method: "POST",
    body: formData
  });
  const body = (await res.json().catch(() => ({}))) as { logoUrl?: string; error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Could not upload account logo.");
  }
  if (!body.logoUrl) {
    throw new Error("Could not upload account logo.");
  }
  return body.logoUrl;
}

/** Writes ops profile to a Location roster; sets homeBranchId when needed. */
export async function saveDriverProfile(
  uid: string,
  driverProfile: DriverProfile,
  branchId: string,
  options?: { driverTitle?: string; isNew?: boolean }
): Promise<void> {
  const resolved = requireBranchId(branchId);
  const userRef = doc(db(), Collections.users, uid);
  const userSnap = await getDoc(userRef);
  const homeBranchId =
    typeof userSnap.data()?.homeBranchId === "string" ? userSnap.data()?.homeBranchId : null;
  if (homeBranchId && homeBranchId !== resolved) {
    throw new Error("This chauffeur is assigned to another Location.");
  }
  const patch: Record<string, unknown> = {};
  if (options?.isNew) {
    const [license, driverSnap] = await Promise.all([
      fetchLicense(),
      getDocs(query(collection(db(), Collections.users), where("role", "==", "driver")))
    ]);
    const used = driverSnap.docs.filter((d) => d.id !== uid).length;
    if (!canAddDriver(used, license.maxDrivers)) {
      throw new Error("Driver limit reached on the current license.");
    }
    patch.role = "driver";
    patch.homeBranchId = resolved;
  } else if (!homeBranchId) {
    patch.homeBranchId = resolved;
  }
  if (Object.keys(patch).length > 0) {
    await updateDoc(userRef, patch);
  }
  await upsertBranchDriver(uid, driverProfile, resolved);
  if (options?.driverTitle) {
    const action = options.isNew ? "created" : "updated";
    void createActivityNotification(driverNotification(action, options.driverTitle, uid));
  }
}

/** Deletes the chauffeur Auth account, user doc, and home roster. */
export async function removeDriver(
  uid: string,
  branchId: string,
  driverTitle?: string
): Promise<void> {
  const resolved = requireBranchId(branchId);
  const res = await fetch(`/api/drivers/${encodeURIComponent(uid)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchId: resolved, driverTitle })
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? "Could not delete the chauffeur.");
  }
}

// ────────────────────────── Branch drivers (roster) ──────────────────────────

export function listenBranchDrivers(
  branchId: string,
  onUpdate: (drivers: BranchDriver[]) => void
): Unsub {
  const id = requireBranchId(branchId);
  const nested = query(branchCollectionRef(db(), "drivers", id));
  return listenQuery(
    nested,
    (snap) => snapToList(snap, mapBranchDriver),
    onUpdate,
    onSnapshotError("branch drivers", onUpdate)
  );
}

export async function fetchBranchDrivers(branchId: string): Promise<BranchDriver[]> {
  const id = requireBranchId(branchId);
  const snap = await getDocs(branchCollectionRef(db(), "drivers", id));
  return snap.docs.map((dc) => mapBranchDriver(dc.id, dc.data()));
}

export async function fetchBranchDriver(
  uid: string,
  branchId: string
): Promise<BranchDriver | null> {
  const id = requireBranchId(branchId);
  const snap = await getDoc(branchDocRef(db(), "drivers", uid, id));
  return snap.exists() ? mapBranchDriver(snap.id, snap.data()) : null;
}

export async function upsertBranchDriver(
  uid: string,
  profile: DriverProfile,
  branchId: string
): Promise<void> {
  const id = requireBranchId(branchId);
  const ref = branchDocRef(db(), "drivers", uid, id);
  const existing = await getDoc(ref);
  const now = serverTimestamp();
  await setDoc(
    ref,
    stripUndefined({
      id: uid,
      userId: uid,
      ...profile,
      timeZoneIdentifier: deleteField(),
      createdAt: existing.exists() ? (existing.data()?.createdAt ?? now) : now,
      updatedAt: now
    }),
    { merge: true }
  );
}

// ────────────────────────────── Vehicles ─────────────────────────────

export function listenVehicles(
  branchId: string,
  onUpdate: (vehicles: Vehicle[]) => void
): Unsub {
  const id = requireBranchId(branchId);
  const nested = query(branchCollectionRef(db(), "vehicles", id));
  return listenQuery(
    nested,
    (snap) => {
      const rows = snapToList(snap, (_, d) => mapVehicle(d));
      rows.sort((a, b) => vehicleDisplayName(a).localeCompare(vehicleDisplayName(b)));
      return rows;
    },
    onUpdate,
    onSnapshotError("vehicles", onUpdate)
  );
}

export async function fetchVehicles(branchId: string): Promise<Vehicle[]> {
  const id = requireBranchId(branchId);
  const nestedSnap = await getDocs(branchCollectionRef(db(), "vehicles", id));
  return nestedSnap.docs.map((dc) => mapVehicle(dc.data()));
}

export async function fetchVehicle(
  vehicleDocumentId: string,
  branchId: string
): Promise<Vehicle | null> {
  const id = requireBranchId(branchId);
  const nested = await getDoc(branchDocRef(db(), "vehicles", vehicleDocumentId, id));
  return nested.exists() ? mapVehicle(nested.data()) : null;
}

export async function upsertVehicle(vehicle: Vehicle, branchId: string): Promise<void> {
  const id = requireBranchId(branchId);
  const ref = branchDocRef(db(), "vehicles", vehicle.driverID, id);
  const existing = await getDoc(ref);
  const action = existing.exists() ? "updated" : "created";
  await setDoc(ref, stripUndefined({ ...vehicle }));
  void createActivityNotification(
    vehicleNotification(action, vehicleDisplayTitle(vehicle), vehicle.driverID)
  );
}

export async function deleteVehicle(driverID: string, branchId: string): Promise<void> {
  const id = requireBranchId(branchId);
  const ref = branchDocRef(db(), "vehicles", driverID, id);
  const snap = await getDoc(ref);
  const title = snap.exists() ? vehicleDisplayTitle(mapVehicle(snap.data())) : "Fleet vehicle";
  await deleteDoc(ref);
  void createActivityNotification(vehicleNotification("deleted", title, driverID));
}

/** Assign a fleet vehicle to a chauffeur, clearing prior links. */
export async function assignFleetVehicle(
  vehicles: Vehicle[],
  vehicleDocumentId: string,
  toChauffeurUserId: string,
  branchId: string
): Promise<void> {
  const id = requireBranchId(branchId);
  const batch = writeBatch(db());
  let found = false;
  for (const v of vehicles) {
    if (v.driverID === vehicleDocumentId) found = true;
    const linked = effectiveChauffeurUserId(v);
    if (linked === toChauffeurUserId && v.driverID !== vehicleDocumentId) {
      batch.update(branchDocRef(db(), "vehicles", v.driverID, id), {
        assignedChauffeurUserId: ""
      });
    }
  }
  if (!found) throw new Error("That fleet vehicle no longer exists. Refresh and try again.");
  batch.update(branchDocRef(db(), "vehicles", vehicleDocumentId, id), {
    assignedChauffeurUserId: toChauffeurUserId
  });
  await batch.commit();
}

/** Clears the chauffeur linked to a fleet vehicle. */
export async function unassignFleetVehicle(
  vehicleDocumentId: string,
  branchId: string
): Promise<void> {
  const id = requireBranchId(branchId);
  await updateDoc(branchDocRef(db(), "vehicles", vehicleDocumentId, id), {
    assignedChauffeurUserId: ""
  });
}

// ───────────────────────────── Locations ─────────────────────────────

export function listenFleetLocations(
  branchId: string,
  onUpdate: (locations: FleetLocation[]) => void
): Unsub {
  const id = requireBranchId(branchId);
  const nested = query(
    branchCollectionRef(db(), "locations", id),
    orderBy("createdAt", "desc")
  );
  return listenQuery(
    nested,
    (snap) => snapToList(snap, mapFleetLocation),
    onUpdate,
    onSnapshotError("locations", onUpdate)
  );
}

export async function fetchFleetLocations(branchId: string): Promise<FleetLocation[]> {
  const id = requireBranchId(branchId);
  const nested = query(
    branchCollectionRef(db(), "locations", id),
    orderBy("createdAt", "desc")
  );
  return snapToList(await getDocs(nested), mapFleetLocation);
}

async function clearOtherDefaultFleetLocationsInBranch(
  branchId: string,
  exceptId: string
): Promise<void> {
  const id = requireBranchId(branchId);
  const snap = await getDocs(branchCollectionRef(db(), "locations", id));
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

export async function createFleetLocation(
  branchId: string,
  input: {
    name: string;
    addressLine: string;
    latitude: number;
    longitude: number;
    isDefault?: boolean;
  }
): Promise<void> {
  const resolved = requireBranchId(branchId);
  const name = input.name.trim();
  const addressLine = input.addressLine.trim();
  if (!name || !addressLine) throw new Error("Enter a name and address before saving this office.");
  const id = crypto.randomUUID();
  const isDefault = input.isDefault === true;

  if (isDefault) await clearOtherDefaultFleetLocationsInBranch(resolved, id);

  await setDoc(branchDocRef(db(), "locations", id, resolved), {
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

export async function updateFleetLocation(
  location: FleetLocation,
  branchId: string
): Promise<void> {
  const resolved = requireBranchId(branchId);
  const name = location.name.trim();
  const addressLine = location.addressLine.trim();
  if (!name || !addressLine) throw new Error("Enter a name and address before saving this office.");
  const isDefault = location.isDefault === true;

  if (isDefault) await clearOtherDefaultFleetLocationsInBranch(resolved, location.id);

  await updateDoc(branchDocRef(db(), "locations", location.id, resolved), {
    name,
    addressLine,
    latitude: location.latitude,
    longitude: location.longitude,
    isDefault
  });
  void createActivityNotification(locationNotification("updated", name, location.id));
}

export async function deleteFleetLocation(id: string, branchId: string): Promise<void> {
  const resolved = requireBranchId(branchId);
  const ref = branchDocRef(db(), "locations", id, resolved);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const location = mapFleetLocation(snap.id, snap.data());
  if (location.isDefault) {
    throw new Error("Cannot delete the default office. Set another office as default first.");
  }
  await deleteDoc(ref);
  void createActivityNotification(locationNotification("deleted", location.name, id));
}

// ───────────────────────── App settings (config) ─────────────────────

export async function fetchPricingConfiguration(branchId: string): Promise<PricingConfig> {
  const id = requireBranchId(branchId);
  const nested = await getDoc(branchSettingsDocRef(db(), BranchSettingsDocs.pricing, id));
  if (!nested.exists()) {
    throw new ConfigError("Pricing is not configured. Set pricing for this location first.");
  }
  return mapPricingConfig(nested.data());
}

export async function savePricingConfiguration(
  config: PricingConfig,
  branchId: string
): Promise<void> {
  const id = requireBranchId(branchId);
  validatePricingConfig(config);
  await setDoc(
    branchSettingsDocRef(db(), BranchSettingsDocs.pricing, id),
    stripUndefined({ ...config }),
    { merge: true }
  );
  invalidatePricingConfigurationCache(id);
  void notifyLocationSetting(id, (name) => pricingNotification(id, name));
}

// ───────────────────────── Vehicle classes ─────────────────────────

export async function fetchVehicleClasses(branchId: string): Promise<VehicleClass[]> {
  const id = requireBranchId(branchId);
  const nestedSnap = await getDocs(branchCollectionRef(db(), "vehicle_classes", id));
  return nestedSnap.docs
    .map((docSnap) => mapVehicleClass(docSnap.id, docSnap.data()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
}

export async function fetchVehicleClass(
  id: string,
  branchId: string
): Promise<VehicleClass | null> {
  const resolved = requireBranchId(branchId);
  const nested = await getDoc(branchDocRef(db(), "vehicle_classes", id, resolved));
  return nested.exists() ? mapVehicleClass(nested.id, nested.data()) : null;
}

export function listenVehicleClasses(
  onUpdate: (classes: VehicleClass[]) => void,
  branchId: string
): Unsub {
  const id = requireBranchId(branchId);
  const nested = query(branchCollectionRef(db(), "vehicle_classes", id));
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

export async function saveVehicleClass(
  vehicleClass: VehicleClass,
  branchId: string
): Promise<void> {
  validateVehicleClass(vehicleClass);
  const resolvedBranchId = requireBranchId(branchId);
  const res = await fetch("/api/vehicle-classes", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...vehicleClass, branchId: resolvedBranchId })
  });
  if (!res.ok) {
    await parseApiError(res, "Could not save vehicle class.");
  }
  void notifyLocationSetting(resolvedBranchId, (name) =>
    vehicleClassesNotification(resolvedBranchId, name)
  );
}

export async function deleteVehicleClass(
  id: string,
  branchId: string
): Promise<void> {
  const resolvedBranchId = requireBranchId(branchId);
  const res = await fetch(`/api/vehicle-classes/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branchId: resolvedBranchId })
  });
  if (!res.ok) {
    await parseApiError(res, "Could not delete vehicle class.");
  }
  void notifyLocationSetting(resolvedBranchId, (name) =>
    vehicleClassesNotification(resolvedBranchId, name, "Vehicle class removed")
  );
}

export async function fetchOperatingHours(branchId: string): Promise<AppFleetOperatingHours> {
  const id = requireBranchId(branchId);
  const nested = await getDoc(
    branchSettingsDocRef(db(), BranchSettingsDocs.operatingHours, id)
  );
  return nested.exists() ? mapOperatingHours(nested.data()) : emptyOperatingHours;
}

export async function saveOperatingHours(
  hours: AppFleetOperatingHours,
  branchId: string
): Promise<void> {
  const id = requireBranchId(branchId);
  await setDoc(
    branchSettingsDocRef(db(), BranchSettingsDocs.operatingHours, id),
    stripUndefined({
      schedules: hours.schedules,
      timeZoneIdentifier: deleteField()
    }),
    { merge: true }
  );
  void notifyLocationSetting(id, (name) => operatingHoursNotification(id, name));
}

export async function fetchOperatorLocale(branchId: string): Promise<OperatorLocale> {
  const id = requireBranchId(branchId);
  const snap = await getDoc(branchSettingsDocRef(db(), BranchSettingsDocs.locale, id));
  if (!snap.exists()) {
    throw new ConfigError("Locale is not configured. Set locale for this location first.");
  }
  return mapOperatorLocale(snap.data());
}

export async function saveOperatorLocale(
  locale: OperatorLocale,
  branchId: string
): Promise<void> {
  const id = requireBranchId(branchId);
  validateOperatorLocale(locale);
  await setDoc(
    branchSettingsDocRef(db(), BranchSettingsDocs.locale, id),
    stripUndefined({
      ...locale,
      driverLicenceCountry: deleteField(),
      mapboxCountry: deleteField()
    }),
    { merge: true }
  );
  invalidateOperatorLocaleCache(id);
  if (id === getActiveBranchId()) {
    setActiveFormatLocale({ locale: locale.locale, currency: locale.currency });
  }
  void notifyLocationSetting(id, (name) => localeNotification(id, name));
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

export async function fetchLicense(): Promise<AppLicense> {
  if (!licensePromise) {
    licensePromise = loadLicense().catch((err) => {
      licensePromise = null;
      throw err;
    });
  }
  return licensePromise;
}

async function loadLicense(): Promise<AppLicense> {
  const snap = await getDoc(doc(db(), Collections.appSettings, AppSettingsDocs.license));
  if (!snap.exists()) {
    throw new Error(LICENSE_NOT_CONFIGURED_MESSAGE);
  }
  return mapLicense(snap.data());
}

export async function saveLicense(license: AppLicense): Promise<void> {
  await setDoc(
    doc(db(), Collections.appSettings, AppSettingsDocs.license),
    stripUndefined({ ...license }),
    { merge: true }
  );
  licensePromise = null;
}

export async function fetchPlansCatalog(): Promise<AppPlansCatalog> {
  if (!plansCatalogPromise) {
    plansCatalogPromise = loadPlansCatalog().catch((err) => {
      plansCatalogPromise = null;
      throw err;
    });
  }
  return plansCatalogPromise;
}

async function loadPlansCatalog(): Promise<AppPlansCatalog> {
  const snap = await getDoc(doc(db(), Collections.appSettings, AppSettingsDocs.plans));
  if (!snap.exists()) {
    throw new Error(PLANS_NOT_CONFIGURED_MESSAGE);
  }
  return mapPlansCatalog(snap.data());
}

// ─────────────────────────────── Invoices ───────────────────────────────

export function listenInvoices(
  onUpdate: (invoices: Invoice[]) => void,
  branchId: string
): Unsub {
  const id = requireBranchId(branchId);
  const nested = query(
    branchCollectionRef(db(), "invoices", id),
    orderBy("issuedAt", "desc")
  );
  return listenQuery(
    nested,
    (snap) => snap.docs.map((dc) => mapInvoice(dc.id, dc.data(), id)),
    onUpdate,
    onSnapshotError("invoices", onUpdate)
  );
}

export async function fetchInvoice(id: string, branchId: string): Promise<Invoice | null> {
  const resolved = requireBranchId(branchId);
  const nested = await getDoc(branchDocRef(db(), "invoices", id, resolved));
  return nested.exists() ? mapInvoice(nested.id, nested.data(), resolved) : null;
}

export async function createInvoice(
  invoice: Omit<Invoice, "id" | "createdAt" | "updatedAt">,
  branchId: string
): Promise<string> {
  const resolved = requireBranchId(branchId);
  const ref = await addDoc(branchCollectionRef(db(), "invoices", resolved), {
    ...stripUndefined(invoice),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  void createActivityNotification(invoiceNotification("created", invoice.invoiceNumber, ref.id));
  return ref.id;
}

export async function updateInvoice(
  id: string,
  branchId: string,
  patch: Partial<Invoice>
): Promise<void> {
  const resolved = requireBranchId(branchId);
  await updateDoc(branchDocRef(db(), "invoices", id, resolved), {
    ...stripUndefined(patch),
    updatedAt: serverTimestamp()
  });
  void createActivityNotification(invoiceNotification("updated", patch.invoiceNumber ?? id, id));
}

export async function deleteInvoice(id: string, branchId: string): Promise<void> {
  const resolved = requireBranchId(branchId);
  const ref = branchDocRef(db(), "invoices", id, resolved);
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
  await setDoc(doc(db(), Collections.appSettings, docId), stripUndefined({ ...data }), {
    merge: true
  });
}
