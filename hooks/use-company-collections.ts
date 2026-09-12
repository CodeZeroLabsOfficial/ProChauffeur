"use client";

import { useEffect, useMemo, useState } from "react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { useSessionUser } from "@/components/providers/session-provider";
import { grantedBranchIds } from "@/lib/auth/staff-access";
import {
  queryInvoicesForCorporateAccount,
  queryTripsForCorporateAccount,
  queryInvoicesForCustomer,
  queryTripsForCustomer
} from "@/lib/services/firebase-service";
import type { Invoice, Trip } from "@/lib/models";

/** Cross-Location trips for one customer (collection-group, paged). */
export function useCustomerTrips(customerId: string, pageSize = 50) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const id = customerId.trim();
    if (!id) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void queryTripsForCustomer(id, { pageSize })
      .then((result) => {
        if (!cancelled) setTrips(result.trips);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, pageSize]);

  return { trips, loading };
}

export function useCustomerInvoices(customerId: string, pageSize = 50) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const id = customerId.trim();
    if (!id) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void queryInvoicesForCustomer(id, { pageSize })
      .then((rows) => {
        if (!cancelled) setInvoices(rows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId, pageSize]);

  return { invoices, loading };
}

/** Corporate account trips/invoices across granted Locations (one-shot paged). */
export function useCorporateAccountActivity(accountId: string) {
  const session = useSessionUser();
  const { allBranches, branchesLoading } = useActiveBranch();
  const branchIds = useMemo(
    () => grantedBranchIds(session, allBranches.map((branch) => branch.id)),
    [session, allBranches]
  );
  const [trips, setTrips] = useState<Trip[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const id = accountId.trim();
    if (!id || branchesLoading) {
      return;
    }
    if (branchIds.length === 0) {
      setTrips([]);
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([
      queryTripsForCorporateAccount(id, branchIds),
      queryInvoicesForCorporateAccount(id, branchIds)
    ])
      .then(([nextTrips, nextInvoices]) => {
        if (cancelled) return;
        setTrips(nextTrips);
        setInvoices(nextInvoices);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountId, branchIds, branchesLoading]);

  return { trips, invoices, loading };
}
