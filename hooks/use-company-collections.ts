"use client";

import { useEffect, useMemo, useState } from "react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { useActiveLocationData } from "@/components/providers/active-location-data-provider";
import { useSessionUser } from "@/components/providers/session-provider";
import { grantedBranchIds } from "@/lib/auth/staff-access";
import { listenInvoices, listenTrips } from "@/lib/services/firebase-service";
import type { Invoice, Trip } from "@/lib/models";

function mergeBranchRows<T extends { id: string; branchId?: string | null }>(
  byBranch: Record<string, T[]>,
  sortValue: (row: T) => number
): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();
  for (const [branchId, rows] of Object.entries(byBranch)) {
    for (const row of rows) {
      const key = `${row.branchId ?? branchId}:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(row);
    }
  }
  merged.sort((a, b) => sortValue(b) - sortValue(a));
  return merged;
}

function useMergedBranchCollections<T extends { id: string; branchId?: string | null }>(
  listen: (onUpdate: (rows: T[]) => void, branchId: string) => () => void,
  sortValue: (row: T) => number,
  activeRows: T[],
  activeLoading: boolean
): { rows: T[]; loading: boolean } {
  const session = useSessionUser();
  const { branchId, allBranches, branchesLoading } = useActiveBranch();
  const ids = useMemo(
    () => grantedBranchIds(session, allBranches.map((branch) => branch.id)),
    [session, allBranches]
  );
  const otherIds = useMemo(
    () => ids.filter((id) => id !== branchId),
    [ids, branchId]
  );
  const otherIdsKey = otherIds.join(",");
  const [byBranch, setByBranch] = useState<Record<string, T[]>>({});
  const [readyBranches, setReadyBranches] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (branchesLoading) return;
    const branchIds = otherIdsKey ? otherIdsKey.split(",") : [];
    let cancelled = false;
    setByBranch({});
    setReadyBranches(new Set());

    if (branchIds.length === 0) {
      return;
    }

    const unsubs = branchIds.map((id) =>
      listen((rows) => {
        if (cancelled) return;
        setByBranch((prev) => ({ ...prev, [id]: rows }));
        setReadyBranches((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
      }, id)
    );

    return () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
    };
  }, [branchesLoading, otherIdsKey, listen]);

  const mergedByBranch = useMemo(() => {
    const next = { ...byBranch };
    if (ids.includes(branchId)) {
      next[branchId] = activeRows;
    }
    return next;
  }, [byBranch, branchId, activeRows, ids]);

  const rows = useMemo(() => mergeBranchRows(mergedByBranch, sortValue), [mergedByBranch, sortValue]);
  const loading =
    branchesLoading ||
    (ids.length > 0 &&
      ((ids.includes(branchId) && activeLoading) ||
        otherIds.some((id) => !readyBranches.has(id))));
  return { rows, loading };
}

function listenBranchTrips(onUpdate: (rows: Trip[]) => void, branchId: string) {
  return listenTrips(onUpdate, 800, branchId);
}

function listenBranchInvoices(onUpdate: (rows: Invoice[]) => void, branchId: string) {
  return listenInvoices(onUpdate, branchId);
}

function tripCreatedAtMs(trip: Trip): number {
  return trip.createdAt.getTime();
}

function invoiceIssuedAtMs(invoice: Invoice): number {
  return invoice.issuedAt.getTime();
}

/** Trips from granted Locations (including inactive). Not tied to the switcher. */
export function useCompanyTrips(): { trips: Trip[]; loading: boolean } {
  const { trips, tripsLoading } = useActiveLocationData();
  const { rows, loading } = useMergedBranchCollections(
    listenBranchTrips,
    tripCreatedAtMs,
    trips,
    tripsLoading
  );
  return { trips: rows, loading };
}

/** Invoices from granted Locations (including inactive). Not tied to the switcher. */
export function useCompanyInvoices(): { invoices: Invoice[]; loading: boolean } {
  const { invoices, invoicesLoading } = useActiveLocationData();
  const { rows, loading } = useMergedBranchCollections(
    listenBranchInvoices,
    invoiceIssuedAtMs,
    invoices,
    invoicesLoading
  );
  return { invoices: rows, loading };
}
