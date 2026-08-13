"use client";

import { useEffect, useState } from "react";

import {
  listenInvoices,
  listenTrips,
  listenVehicleClasses
} from "@/lib/services/firebase-service";
import type { Invoice, Trip, VehicleClass } from "@/lib/models";

/** Trips for one Location id (URL), not the switcher. */
export function useBranchTrips(branchId: string): { trips: Trip[]; loading: boolean } {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = branchId.trim();
    if (!id) {
      setTrips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenTrips(
      (rows) => {
        setTrips(rows);
        setLoading(false);
      },
      800,
      id
    );
  }, [branchId]);

  return { trips, loading };
}

/** Invoices for one Location id (URL), not the switcher. */
export function useBranchInvoices(branchId: string): { invoices: Invoice[]; loading: boolean } {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = branchId.trim();
    if (!id) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return listenInvoices((rows) => {
      setInvoices(rows);
      setLoading(false);
    }, id);
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
