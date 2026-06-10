"use client";

import { useEffect, useState } from "react";

import { useCollectionsContext } from "@/components/providers/collections-provider";
import {
  listenFleetLocations,
  listenInvoices,
  listenNotifications,
  listenTrips,
  listenTrip,
  listenUsers,
  listenVehicleClasses,
  listenVehicles
} from "@/lib/services/firebase-service";
import type {
  ActivityNotification,
  FleetLocation,
  Invoice,
  Trip,
  User,
  Vehicle,
  VehicleClass
} from "@/lib/models";

export function useTrips() {
  const ctx = useCollectionsContext();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ctx) return;
    const unsub = listenTrips((rows) => {
      setTrips(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [ctx]);

  if (ctx) {
    return { trips: ctx.trips, loading: ctx.tripsLoading };
  }
  return { trips, loading };
}

export function useUsers() {
  const ctx = useCollectionsContext();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ctx) return;
    const unsub = listenUsers((rows) => {
      setUsers(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [ctx]);

  if (ctx) {
    return { users: ctx.users, loading: ctx.usersLoading };
  }
  return { users, loading };
}

export function useVehicles() {
  const ctx = useCollectionsContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ctx) return;
    const unsub = listenVehicles((rows) => {
      setVehicles(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [ctx]);

  if (ctx) {
    return { vehicles: ctx.vehicles, loading: ctx.vehiclesLoading };
  }
  return { vehicles, loading };
}

export function useFleetLocations() {
  const ctx = useCollectionsContext();
  const [locations, setLocations] = useState<FleetLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ctx) return;
    const unsub = listenFleetLocations((rows) => {
      setLocations(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [ctx]);

  if (ctx) {
    return { locations: ctx.locations, loading: ctx.locationsLoading };
  }
  return { locations, loading };
}

export function useInvoices() {
  const ctx = useCollectionsContext();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ctx) return;
    const unsub = listenInvoices((rows) => {
      setInvoices(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [ctx]);

  if (ctx) {
    return { invoices: ctx.invoices, loading: ctx.invoicesLoading };
  }
  return { invoices, loading };
}

export function useVehicleClasses() {
  const ctx = useCollectionsContext();
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ctx) return;
    const unsub = listenVehicleClasses((rows) => {
      setVehicleClasses(rows);
      setLoading(false);
    });
    return () => unsub();
  }, [ctx]);

  if (ctx) {
    return { vehicleClasses: ctx.vehicleClasses, loading: ctx.vehicleClassesLoading };
  }
  return { vehicleClasses, loading };
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
