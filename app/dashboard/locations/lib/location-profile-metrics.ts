import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";
import { tripPickupReferenceDate } from "@/lib/models/trip";
import { paidRevenueForInvoices } from "@/app/dashboard/drivers/lib/driver-profile-metrics";

export function locationOverviewMetrics(trips: Trip[], invoices: Invoice[]) {
  const completed = trips.filter((t) => t.status === "completed").length;
  const totalRevenue = paidRevenueForInvoices(invoices.filter((i) => i.status === "paid"));

  return {
    totalTrips: trips.length,
    completed,
    totalRevenue,
    trips,
    invoices
  };
}

export function locationRecentTrips(trips: Trip[], limit = 6): Trip[] {
  const now = Date.now();
  const upcoming = [...trips]
    .filter(
      (t) =>
        t.status !== "cancelled" &&
        t.status !== "completed" &&
        tripPickupReferenceDate(t).getTime() >= now
    )
    .sort(
      (a, b) => tripPickupReferenceDate(a).getTime() - tripPickupReferenceDate(b).getTime()
    );

  if (upcoming.length >= limit) return upcoming.slice(0, limit);

  const recent = [...trips]
    .filter((t) => t.status === "completed" || t.status === "in_progress")
    .sort(
      (a, b) => tripPickupReferenceDate(b).getTime() - tripPickupReferenceDate(a).getTime()
    );

  const seen = new Set<string>();
  const merged: Trip[] = [];
  for (const trip of [...upcoming, ...recent]) {
    if (seen.has(trip.id)) continue;
    seen.add(trip.id);
    merged.push(trip);
    if (merged.length >= limit) break;
  }
  return merged;
}
