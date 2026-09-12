"use client";

import { useEffect, useState } from "react";

import { listenVehicleClasses, queryInvoices, queryTrips } from "@/lib/services/firebase-service";
import type { Invoice, Trip, VehicleClass } from "@/lib/models";

/** One-shot paged trips for a Location URL (not a live listener). */
export function useBranchTrips(branchId: string): { trips: Trip[]; loading: boolean } {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = branchId.trim();
    let cancelled = false;
    if (!id) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void queryTrips(id, { pageSize: 50 })
      .then((result) => {
        if (!cancelled) setTrips(result.trips);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return { trips, loading };
}

/** One-shot paged invoices for a Location URL. */
export function useBranchInvoices(branchId: string): { invoices: Invoice[]; loading: boolean } {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = branchId.trim();
    let cancelled = false;
    if (!id) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void queryInvoices(id, { pageSize: 50 })
      .then((result) => {
        if (!cancelled) setInvoices(result.invoices);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [branchId]);

  return { invoices, loading };
}

/** Vehicle classes for one Location id (URL), not the switcher. */
export function useBranchVehicleClasses(branchId: string): {
  vehicleClasses: VehicleClass[];
  loading: boolean;
} {
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = branchId.trim();
    if (!id) {
      setVehicleClasses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenVehicleClasses((rows) => {
      setVehicleClasses(rows);
      setLoading(false);
    }, id);
  }, [branchId]);

  return { vehicleClasses, loading };
}
