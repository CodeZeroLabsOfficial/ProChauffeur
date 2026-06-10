"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  listenFleetLocations,
  listenInvoices,
  listenTrips,
  listenUsers,
  listenVehicleClasses,
  listenVehicles
} from "@/lib/services/firebase-service";
import type { FleetLocation, Invoice, Trip, User, Vehicle, VehicleClass } from "@/lib/models";

type CollectionsContextValue = {
  trips: Trip[];
  tripsLoading: boolean;
  users: User[];
  usersLoading: boolean;
  vehicles: Vehicle[];
  vehiclesLoading: boolean;
  locations: FleetLocation[];
  locationsLoading: boolean;
  invoices: Invoice[];
  invoicesLoading: boolean;
  vehicleClasses: VehicleClass[];
  vehicleClassesLoading: boolean;
};

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [locations, setLocations] = useState<FleetLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);
  const [vehicleClassesLoading, setVehicleClassesLoading] = useState(true);

  useEffect(() => {
    const unsub = listenTrips((rows) => {
      setTrips(rows);
      setTripsLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenUsers((rows) => {
      setUsers(rows);
      setUsersLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenVehicles((rows) => {
      setVehicles(rows);
      setVehiclesLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenFleetLocations((rows) => {
      setLocations(rows);
      setLocationsLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenInvoices((rows) => {
      setInvoices(rows);
      setInvoicesLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = listenVehicleClasses((rows) => {
      setVehicleClasses(rows);
      setVehicleClassesLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <CollectionsContext.Provider
      value={{
        trips,
        tripsLoading,
        users,
        usersLoading,
        vehicles,
        vehiclesLoading,
        locations,
        locationsLoading,
        invoices,
        invoicesLoading,
        vehicleClasses,
        vehicleClassesLoading
      }}>
      {children}
    </CollectionsContext.Provider>
  );
}

export function useCollectionsContext(): CollectionsContextValue | null {
  return useContext(CollectionsContext);
}
