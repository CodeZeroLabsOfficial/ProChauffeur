import type { Invoice } from "@/lib/models/invoice";
import type { DriverProfile, User } from "@/lib/models/user";
import {
  tripPickupReferenceDate,
  type Trip
} from "@/lib/models/trip";
import {
  getMonthRange,
  invoiceRevenueInRange,
  tripsInRange
} from "@/app/dashboard/lib/dashboard-metrics";

export function tripsForDriver(trips: Trip[], driverId: string): Trip[] {
  return trips.filter((t) => t.driverID === driverId);
}

export function tripIdSetForDriver(trips: Trip[], driverId: string): Set<string> {
  return new Set(tripsForDriver(trips, driverId).map((t) => t.id));
}

export function invoicesForDriver(invoices: Invoice[], tripIds: Set<string>): Invoice[] {
  return invoices.filter((inv) => inv.tripIDs.some((id) => tripIds.has(id)));
}

export function paidRevenueForInvoices(invoices: Invoice[]): number {
  return invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);
}

export function driverProfileCompleteness(user: User, profile: DriverProfile): number {
  const checks = [
    Boolean(user.profile.photoURL?.trim()),
    Boolean(user.profile.displayName?.trim()),
    Boolean(user.profile.phoneNumber?.trim()),
    Boolean(user.email?.trim()),
    Boolean(profile.bioStatement?.trim()),
    Boolean(profile.driversLicenseNumber?.trim()),
    Boolean(profile.driversLicenseExpiry),
    Boolean(profile.operatorAccreditationNumber?.trim()),
    profile.qualifications.length > 0,
    profile.serviceSpecialties.length > 0
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function driverOverviewMetrics(
  trips: Trip[],
  invoices: Invoice[],
  driverId: string,
  now = new Date()
) {
  const driverTrips = tripsForDriver(trips, driverId);
  const tripIds = new Set(driverTrips.map((t) => t.id));
  const driverInvoices = invoicesForDriver(invoices, tripIds);

  const completed = driverTrips.filter((t) => t.status === "completed").length;
  const active = driverTrips.filter(
    (t) => t.status === "in_progress" || t.status === "en_route_pickup"
  ).length;
  const upcoming = driverTrips.filter(
    (t) => t.status === "requested" || t.status === "accepted"
  ).length;

  const thisMonth = getMonthRange(now, 0);
  const monthTrips = tripsInRange(driverTrips, thisMonth.start, thisMonth.end);
  const monthTripIds = new Set(monthTrips.map((t) => t.id));
  const monthInvoices = invoicesForDriver(invoices, monthTripIds);
  const monthRevenue = invoiceRevenueInRange(monthInvoices, thisMonth.start, thisMonth.end);
  const totalRevenue = paidRevenueForInvoices(
    driverInvoices.filter((i) => i.status === "paid")
  );

  return {
    totalTrips: driverTrips.length,
    completed,
    active,
    upcoming,
    monthRevenue,
    totalRevenue,
    driverTrips,
    driverInvoices,
    tripIds
  };
}

export function sortTripsByPickupDesc(trips: Trip[]): Trip[] {
  return [...trips].sort(
    (a, b) => tripPickupReferenceDate(b).getTime() - tripPickupReferenceDate(a).getTime()
  );
}
