"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import {
  listenBranchDrivers,
  listenFleetLocations,
  listenInvoices,
  listenTrips,
  listenUsers,
  listenVehicleClasses,
  listenVehicles
} from "@/lib/services/firebase-service";
import type { FleetLocation, Invoice, Trip, User, Vehicle, VehicleClass } from "@/lib/models";
import type { BranchDriver } from "@/lib/models/branch";

type ActiveLocationDataValue = {
  trips: Trip[];
  tripsLoading: boolean;
  users: User[];
  usersLoading: boolean;
  branchDrivers: BranchDriver[];
  branchDriversLoading: boolean;
  vehicles: Vehicle[];
  vehiclesLoading: boolean;
  locations: FleetLocation[];
  locationsLoading: boolean;
  invoices: Invoice[];
  invoicesLoading: boolean;
  vehicleClasses: VehicleClass[];
  vehicleClassesLoading: boolean;
};

const ActiveLocationDataContext = createContext<ActiveLocationDataValue | null>(null);

export function ActiveLocationDataProvider({ children }: { children: ReactNode }) {
  const { branchId } = useActiveBranch();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [branchDrivers, setBranchDrivers] = useState<BranchDriver[]>([]);
  const [branchDriversLoading, setBranchDriversLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [locations, setLocations] = useState<FleetLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);
  const [vehicleClassesLoading, setVehicleClassesLoading] = useState(true);

  useEffect(() => {
    if (!branchId) {
      setTrips([]);
      setTripsLoading(false);
      return;
    }
    setTripsLoading(true);
    const unsub = listenTrips((rows) => {
      setTrips(rows);
      setTripsLoading(false);
    }, 800, branchId);
    return () => unsub();
  }, [branchId]);

  useEffect(() => {
    const unsub = listenUsers((rows) => {
      setUsers(rows);
      setUsersLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!branchId) {
      setBranchDrivers([]);
      setBranchDriversLoading(false);
      return;
    }
    setBranchDriversLoading(true);
    const unsub = listenBranchDrivers((rows) => {
      setBranchDrivers(rows);
      setBranchDriversLoading(false);
    });
    return () => unsub();
  }, [branchId]);

  useEffect(() => {
    if (!branchId) {
      setVehicles([]);
      setVehiclesLoading(false);
      return;
    }
    setVehiclesLoading(true);
    const unsub = listenVehicles((rows) => {
      setVehicles(rows);
      setVehiclesLoading(false);
    });
    return () => unsub();
  }, [branchId]);

  useEffect(() => {
    if (!branchId) {
      setLocations([]);
      setLocationsLoading(false);
      return;
    }
    setLocationsLoading(true);
    const unsub = listenFleetLocations((rows) => {
      setLocations(rows);
      setLocationsLoading(false);
    });
    return () => unsub();
  }, [branchId]);

  useEffect(() => {
    if (!branchId) {
      setInvoices([]);
      setInvoicesLoading(false);
      return;
    }
    setInvoicesLoading(true);
    const unsub = listenInvoices((rows) => {
      setInvoices(rows);
      setInvoicesLoading(false);
    }, branchId);
    return () => unsub();
  }, [branchId]);

  useEffect(() => {
    if (!branchId) {
      setVehicleClasses([]);
      setVehicleClassesLoading(false);
      return;
    }
    setVehicleClassesLoading(true);
    const unsub = listenVehicleClasses((rows) => {
      setVehicleClasses(rows);
      setVehicleClassesLoading(false);
    }, branchId);
    return () => unsub();
  }, [branchId]);

  const value = useMemo(
    () => ({
      trips,
      tripsLoading,
      users,
      usersLoading,
      branchDrivers,
      branchDriversLoading,
      vehicles,
      vehiclesLoading,
      locations,
      locationsLoading,
      invoices,
      invoicesLoading,
      vehicleClasses,
      vehicleClassesLoading
    }),
    [
      trips,
      tripsLoading,
      users,
      usersLoading,
      branchDrivers,
      branchDriversLoading,
      vehicles,
      vehiclesLoading,
      locations,
      locationsLoading,
      invoices,
      invoicesLoading,
      vehicleClasses,
      vehicleClassesLoading
    ]
  );

  return (
    <ActiveLocationDataContext.Provider value={value}>{children}</ActiveLocationDataContext.Provider>
  );
}

export function useActiveLocationData(): ActiveLocationDataValue {
  const ctx = useContext(ActiveLocationDataContext);
  if (!ctx) {
    throw new Error("useActiveLocationData must be used within ActiveLocationDataProvider.");
  }
  return ctx;
}
