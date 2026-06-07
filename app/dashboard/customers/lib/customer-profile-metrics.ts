import type { Invoice } from "@/lib/models/invoice";
import type { User } from "@/lib/models/user";
import { tripPickupReferenceDate, type Trip } from "@/lib/models/trip";
import {
  getMonthRange,
  invoiceRevenueInRange,
  tripsInRange
} from "@/app/dashboard/lib/dashboard-metrics";
import { paidRevenueForInvoices } from "@/app/dashboard/drivers/lib/driver-profile-metrics";

export function tripsForCustomer(trips: Trip[], customerId: string): Trip[] {
  return trips.filter((t) => t.customerID === customerId);
}

export function invoicesForCustomer(invoices: Invoice[], customerId: string): Invoice[] {
  return invoices.filter((inv) => inv.customerID === customerId);
}

export function customerProfileCompleteness(user: User): number {
  const checks = [
    Boolean(user.profile.photoURL?.trim()),
    Boolean(user.profile.displayName?.trim()),
    Boolean(user.profile.phoneNumber?.trim()),
    Boolean(user.email?.trim()),
    Boolean(user.profile.address?.trim())
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function customerOverviewMetrics(
  trips: Trip[],
  invoices: Invoice[],
  customerId: string,
  now = new Date()
) {
  const customerTrips = tripsForCustomer(trips, customerId);
  const customerInvoices = invoicesForCustomer(invoices, customerId);

  const completed = customerTrips.filter((t) => t.status === "completed").length;
  const active = customerTrips.filter(
    (t) => t.status === "in_progress" || t.status === "en_route_pickup"
  ).length;
  const upcoming = customerTrips.filter(
    (t) => t.status === "requested" || t.status === "accepted"
  ).length;

  const thisMonth = getMonthRange(now, 0);
  const monthTrips = tripsInRange(customerTrips, thisMonth.start, thisMonth.end);
  const monthInvoices = customerInvoices.filter((inv) => {
    const issued = inv.issuedAt;
    return issued >= thisMonth.start && issued <= thisMonth.end;
  });
  const monthRevenue = invoiceRevenueInRange(monthInvoices, thisMonth.start, thisMonth.end);
  const totalRevenue = paidRevenueForInvoices(
    customerInvoices.filter((i) => i.status === "paid")
  );

  return {
    totalTrips: customerTrips.length,
    completed,
    active,
    upcoming,
    monthRevenue,
    totalRevenue,
    customerTrips,
    customerInvoices
  };
}

export function sortTripsByPickupDesc(trips: Trip[]): Trip[] {
  return [...trips].sort(
    (a, b) => tripPickupReferenceDate(b).getTime() - tripPickupReferenceDate(a).getTime()
  );
}

export function tripCountByCustomerId(trips: Trip[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const trip of trips) {
    if (!trip.customerID) continue;
    counts.set(trip.customerID, (counts.get(trip.customerID) ?? 0) + 1);
  }
  return counts;
}

export function lastBookingAtForCustomer(trips: Trip[], customerId: string): Date | null {
  const customerTrips = sortTripsByPickupDesc(tripsForCustomer(trips, customerId));
  if (!customerTrips.length) return null;
  return tripPickupReferenceDate(customerTrips[0]);
}
