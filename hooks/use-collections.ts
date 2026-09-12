"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";

import { useActiveLocationData } from "@/components/providers/active-location-data-provider";
import {
  fetchInvoicesInIssuedRange,
  fetchTripsInPickupRange,
  fetchUsersByIds,
  fetchInvoicesByIds,
  listenDispatchTrips,
  listenNotifications,
  listenRequestedTrips,
  listenTrip,
  queryInvoices,
  queryTrips,
  queryUsersByRole,
  searchUsersByRole,
  type QueryTripsOptions
} from "@/lib/services/firebase-service";
import { joinRosterChauffeurs } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
import type { ActivityNotification, Invoice, Trip, User, UserRole } from "@/lib/models";

/** Live Dispatch board trips (open / in-progress) for the active Location. */
export function useDispatchTrips() {
  const { branchId } = useActiveBranch();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = listenDispatchTrips(branchId, (rows) => {
      setTrips(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [branchId]);

  return { trips, loading };
}

/** Live requested trips for notification accept/decline chrome. */
export function useRequestedTrips() {
  const { branchId } = useActiveBranch();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branchId) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = listenRequestedTrips(branchId, (rows) => {
      setTrips(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [branchId]);

  return { trips, loading };
}

/** Paged trips for Bookings / Reports (active Location). */
export function usePagedTrips(
  options: Omit<QueryTripsOptions, "startAfterDoc" | "pageSize"> & { enabled?: boolean }
) {
  const { branchId } = useActiveBranch();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 50;
  const enabled = options.enabled !== false;
  const optionsKey = JSON.stringify({
    from: options.from?.toISOString() ?? null,
    to: options.to?.toISOString() ?? null,
    statuses: options.statuses ?? null,
    driverId: options.driverId ?? null,
    customerId: options.customerId ?? null,
    enabled
  });

  const reload = useCallback(async () => {
    if (!branchId || !enabled) {
      setTrips([]);
      setLastDoc(null);
      setHasMore(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const parsed = JSON.parse(optionsKey) as {
        from: string | null;
        to: string | null;
        statuses: Trip["status"][] | null;
        driverId: string | null;
        customerId: string | null;
      };
      const result = await queryTrips(branchId, {
        from: parsed.from ? new Date(parsed.from) : undefined,
        to: parsed.to ? new Date(parsed.to) : undefined,
        statuses: parsed.statuses ?? undefined,
        driverId: parsed.driverId,
        customerId: parsed.customerId,
        pageSize
      });
      setTrips(result.trips);
      setLastDoc(result.lastDoc);
      setHasMore(result.trips.length >= pageSize);
    } finally {
      setLoading(false);
    }
  }, [branchId, optionsKey, enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!branchId || !enabled || !lastDoc || !hasMore) return;
    const parsed = JSON.parse(optionsKey) as {
      from: string | null;
      to: string | null;
      statuses: Trip["status"][] | null;
      driverId: string | null;
      customerId: string | null;
    };
    const result = await queryTrips(branchId, {
      from: parsed.from ? new Date(parsed.from) : undefined,
      to: parsed.to ? new Date(parsed.to) : undefined,
      statuses: parsed.statuses ?? undefined,
      driverId: parsed.driverId,
      customerId: parsed.customerId,
      pageSize,
      startAfterDoc: lastDoc
    });
    setTrips((prev) => [...prev, ...result.trips]);
    setLastDoc(result.lastDoc);
    setHasMore(result.trips.length >= pageSize);
  }, [branchId, optionsKey, lastDoc, hasMore, enabled]);

  return { trips, loading, hasMore, loadMore, reload };
}

/** One-shot pickup-window trips for dashboard KPIs. */
export function useDashboardTrips(from: Date, to: Date) {
  const { branchId } = useActiveBranch();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const fromKey = from.toISOString();
  const toKey = to.toISOString();

  useEffect(() => {
    let cancelled = false;
    if (!branchId) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchTripsInPickupRange(branchId, new Date(fromKey), new Date(toKey))
      .then((rows) => {
        if (!cancelled) setTrips(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, fromKey, toKey]);

  return { trips, loading };
}

/** One-shot issued-at window for dashboard KPIs / reports. */
export function useDashboardInvoices(from: Date, to: Date) {
  const { branchId } = useActiveBranch();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const fromKey = from.toISOString();
  const toKey = to.toISOString();

  useEffect(() => {
    let cancelled = false;
    if (!branchId) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchInvoicesInIssuedRange(branchId, new Date(fromKey), new Date(toKey))
      .then((rows) => {
        if (!cancelled) setInvoices(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId, fromKey, toKey]);

  return { invoices, loading };
}

/** Batch-fetch invoices by document id (active Location). */
export function useInvoicesByIds(ids: string[]) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const key = useMemo(() => [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort().join(","), [ids]);

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(",") : [];
    if (list.length === 0) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchInvoicesByIds(list)
      .then((rows) => {
        if (!cancelled) setInvoices(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { invoices, loading };
}

/** Paged invoices for Billing (active Location). */
export function usePagedInvoices(pageSize = 50) {
  const { branchId } = useActiveBranch();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const reload = useCallback(async () => {
    if (!branchId) {
      setInvoices([]);
      setLastDoc(null);
      setHasMore(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await queryInvoices(branchId, { pageSize });
      setInvoices(result.invoices);
      setLastDoc(result.lastDoc);
      setHasMore(result.invoices.length >= pageSize);
    } finally {
      setLoading(false);
    }
  }, [branchId, pageSize]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!branchId || !lastDoc || !hasMore) return;
    const result = await queryInvoices(branchId, { pageSize, startAfterDoc: lastDoc });
    setInvoices((prev) => [...prev, ...result.invoices]);
    setLastDoc(result.lastDoc);
    setHasMore(result.invoices.length >= pageSize);
  }, [branchId, pageSize, lastDoc, hasMore]);

  return { invoices, loading, hasMore, loadMore, reload };
}

/** One-shot / paged users for a single Auth role (not a full-collection listen). */
export function useUsersByRole(role: UserRole, pageSize = 50) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await queryUsersByRole(role, { limit: pageSize });
      setUsers(result.users);
      setLastDoc(result.lastDoc);
      setHasMore(result.users.length >= pageSize);
    } finally {
      setLoading(false);
    }
  }, [role, pageSize]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!lastDoc || !hasMore) return;
    const result = await queryUsersByRole(role, { limit: pageSize, startAfterDoc: lastDoc });
    setUsers((prev) => [...prev, ...result.users]);
    setLastDoc(result.lastDoc);
    setHasMore(result.users.length >= pageSize);
  }, [role, pageSize, lastDoc, hasMore]);

  return { users, loading, hasMore, loadMore, reload };
}

/** Role-scoped search for autocomplete pickers. */
export function useUserRoleSearch(role: UserRole, needle: string, limit = 50) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const handle = window.setTimeout(() => {
      void searchUsersByRole(role, needle, { limit })
        .then((rows) => {
          if (!cancelled) setUsers(rows);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [role, needle, limit]);

  return { users, loading };
}

/** Resolve display names for a set of user ids (batched getDoc). */
export function useUsersByIds(ids: string[]) {
  const key = useMemo(() => [...new Set(ids.filter(Boolean))].sort().join(","), [ids]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const list = key ? key.split(",") : [];
    if (list.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchUsersByIds(list)
      .then((rows) => {
        if (!cancelled) setUsers(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  return { users, byId, loading };
}

export function useBranchDrivers() {
  const { branchDrivers, branchDriversLoading } = useActiveLocationData();
  return { branchDrivers, loading: branchDriversLoading };
}

/** Active Location chauffeurs: identity from roster user docs, ops from roster. */
export function useRosterChauffeurs() {
  const { branchDrivers, loading: rosterLoading } = useBranchDrivers();
  const rosterIds = useMemo(
    () =>
      branchDrivers
        .map((entry) => entry.userId?.trim() || entry.id)
        .filter(Boolean),
    [branchDrivers]
  );
  const { users, loading: usersLoading } = useUsersByIds(rosterIds);
  const chauffeurs = useMemo(
    () => joinRosterChauffeurs(users, branchDrivers),
    [users, branchDrivers]
  );
  return { chauffeurs, loading: usersLoading || rosterLoading, branchDrivers };
}

export function useVehicles() {
  const { vehicles, vehiclesLoading } = useActiveLocationData();
  return { vehicles, loading: vehiclesLoading };
}

export function useFleetLocations() {
  const { locations, locationsLoading } = useActiveLocationData();
  return { locations, loading: locationsLoading };
}

export function useVehicleClasses() {
  const { vehicleClasses, vehicleClassesLoading } = useActiveLocationData();
  return { vehicleClasses, loading: vehicleClassesLoading };
}

export function useTrip(id: string) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = listenTrip(id, (row) => {
      setTrip(row);
      setLoading(false);
    });
    return () => unsub();
  }, [id]);
  return { trip, loading, notFound: !loading && !trip };
}

export function useNotifications(max = 50) {
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = listenNotifications((rows) => {
      setNotifications(rows);
      setLoading(false);
    }, max);
    return () => unsub();
  }, [max]);
  return { notifications, loading };
}
