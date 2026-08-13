"use client";

import { useEffect, useMemo, useState } from "react";

import {
  listenBranches,
  listenInvoices,
  listenTrips
} from "@/lib/services/firebase-service";
import type { Invoice, Trip } from "@/lib/models";

function useAllBranchIds(): { ids: string[]; ready: boolean } {
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    return listenBranches((rows) => {
      setIds(rows.map((branch) => branch.id).sort());
    });
  }, []);

  return { ids: ids ?? [], ready: ids !== null };
}

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
  sortValue: (row: T) => number
): { rows: T[]; loading: boolean } {
  const { ids, ready } = useAllBranchIds();
  const idsKey = ids.join(",");
  const [byBranch, setByBranch] = useState<Record<string, T[]>>({});
  const [readyBranches, setReadyBranches] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!ready) return;
    const branchIds = idsKey ? idsKey.split(",") : [];
    if (branchIds.length === 0) {
      setByBranch({});
      setReadyBranches(new Set());
      return;
    }

    let cancelled = false;
    setByBranch({});
    setReadyBranches(new Set());

    const unsubs = branchIds.map((branchId) =>
      listen((rows) => {
        if (cancelled) return;
        setByBranch((prev) => ({ ...prev, [branchId]: rows }));
        setReadyBranches((prev) => {
          if (prev.has(branchId)) return prev;
          const next = new Set(prev);
          next.add(branchId);
          return next;
        });
      }, branchId)
    );

    return () => {
      cancelled = true;
      for (const unsub of unsubs) unsub();
    };
  }, [ready, idsKey, listen]);

  const rows = useMemo(() => mergeBranchRows(byBranch, sortValue), [byBranch, sortValue]);
  const loading = !ready || (ids.length > 0 && ids.some((id) => !readyBranches.has(id)));
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

/** Trips from every Location (including inactive). Not tied to the switcher. */
export function useCompanyTrips(): { trips: Trip[]; loading: boolean } {
  const { rows, loading } = useMergedBranchCollections(listenBranchTrips, tripCreatedAtMs);
  return { trips: rows, loading };
}

/** Invoices from every Location (including inactive). Not tied to the switcher. */
export function useCompanyInvoices(): { invoices: Invoice[]; loading: boolean } {
  const { rows, loading } = useMergedBranchCollections(listenBranchInvoices, invoiceIssuedAtMs);
  return { invoices: rows, loading };
}
