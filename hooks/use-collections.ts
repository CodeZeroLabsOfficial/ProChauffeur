"use client";

import { useEffect, useState } from "react";

import {
  listenFleetLocations,
  listenInvoices,
  listenTrips,
  listenUsers,
  listenVehicles
} from "@/lib/services/firebase-service";
import type { FleetLocation, Invoice, Trip, User, Vehicle } from "@/lib/models";

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = listenTrips((rows) => {
      setTrips(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { trips, loading };
}

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = listenUsers((rows) => {
      setUsers(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { users, loading };
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = listenVehicles((rows) => {
      setVehicles(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { vehicles, loading };
}

export function useFleetLocations() {
  const [locations, setLocations] = useState<FleetLocation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = listenFleetLocations((rows) => {
      setLocations(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { locations, loading };
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = listenInvoices((rows) => {
      setInvoices(rows);
      setLoading(false);
    });
    return () => unsub();
  }, []);
  return { invoices, loading };
}
