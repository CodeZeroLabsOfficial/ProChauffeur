"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import {
  listenBranchDrivers,
  listenFleetLocations,
  listenVehicleClasses,
  listenVehicles
} from "@/lib/services/firebase-service";
import { getCachedOperatorLocale } from "@/lib/services/operator-config-cache";
import { setActiveFormatLocale } from "@/lib/locale/active-format-locale";
import type { FleetLocation, Vehicle, VehicleClass } from "@/lib/models";
import type { BranchDriver } from "@/lib/models/branch";

type ActiveLocationDataValue = {
  branchDrivers: BranchDriver[];
  branchDriversLoading: boolean;
  vehicles: Vehicle[];
  vehiclesLoading: boolean;
  locations: FleetLocation[];
  locationsLoading: boolean;
  vehicleClasses: VehicleClass[];
  vehicleClassesLoading: boolean;
};

const ActiveLocationDataContext = createContext<ActiveLocationDataValue | null>(null);

/** Live ops data for the active Location (roster, fleet, classes, offices). */
export function ActiveLocationDataProvider({ children }: { children: ReactNode }) {
  const { branchId } = useActiveBranch();
  const [branchDrivers, setBranchDrivers] = useState<BranchDriver[]>([]);
  const [branchDriversLoading, setBranchDriversLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [locations, setLocations] = useState<FleetLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);
  const [vehicleClassesLoading, setVehicleClassesLoading] = useState(true);

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
      setActiveFormatLocale(null);
      return;
    }
    let cancelled = false;
    void getCachedOperatorLocale(branchId)
      .then((locale) => {
        if (!cancelled) {
          setActiveFormatLocale({ locale: locale.locale, currency: locale.currency });
        }
      })
      .catch(() => {
        if (!cancelled) setActiveFormatLocale(null);
      });
    return () => {
      cancelled = true;
    };
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
      branchDrivers,
      branchDriversLoading,
      vehicles,
      vehiclesLoading,
      locations,
      locationsLoading,
      vehicleClasses,
      vehicleClassesLoading
    }),
    [
      branchDrivers,
      branchDriversLoading,
      vehicles,
      vehiclesLoading,
      locations,
      locationsLoading,
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
