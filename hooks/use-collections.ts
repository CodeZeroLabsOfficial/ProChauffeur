"use client";

import { useEffect, useMemo, useState } from "react";

import { useActiveLocationData } from "@/components/providers/active-location-data-provider";
import { listenNotifications, listenTrip } from "@/lib/services/firebase-service";
import { joinRosterChauffeurs } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import type { ActivityNotification, Trip } from "@/lib/models";

export function useTrips() {
  const { trips, tripsLoading } = useActiveLocationData();
  return { trips, loading: tripsLoading };
}

export function useUsers() {
  const { users, usersLoading } = useActiveLocationData();
  return { users, loading: usersLoading };
}

export function useBranchDrivers() {
  const { branchDrivers, branchDriversLoading } = useActiveLocationData();
  return { branchDrivers, loading: branchDriversLoading };
}

/** Active Location chauffeurs: identity from users, ops from roster. */
export function useRosterChauffeurs() {
  const { users, loading: usersLoading } = useUsers();
  const { branchDrivers, loading: rosterLoading } = useBranchDrivers();
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

export function useInvoices() {
  const { invoices, invoicesLoading } = useActiveLocationData();
  return { invoices, loading: invoicesLoading };
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
