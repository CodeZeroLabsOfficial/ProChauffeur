import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";
import { tripPickupReferenceDate } from "@/lib/models/trip";
import {
  endOfDay,
  getWeekRange,
  invoiceRevenueInRange,
  isSameDay,
  percentChange,
  startOfDay,
  tripsInRange
} from "@/app/dashboard/lib/dashboard-metrics";
import {
  overviewPeriodOption,
  overviewPeriodRanges,
  type DriverOverviewPeriod
} from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { paidRevenueForInvoices } from "@/app/dashboard/drivers/lib/driver-profile-metrics";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

export type LocationWeeklyHeroMetrics = {
  weeklyRevenue: number;
  previousWeekRevenue: number;
  revenueChangePercent: number | null;
  dailyRevenue: { label: string; revenue: number; isToday: boolean }[];
  trips: number;
  completed: number;
  revenue: number;
};

function invoicesForTrips(invoices: Invoice[], trips: Trip[]) {
  const tripIds = new Set(trips.map((trip) => trip.id));
  return invoices.filter((invoice) => invoice.tripIDs.some((id) => tripIds.has(id)));
}

export function locationWeeklyHeroMetrics(
  trips: Trip[],
  invoices: Invoice[],
  now = new Date()
): LocationWeeklyHeroMetrics {
  const thisWeek = getWeekRange(now, 0);
  const lastWeek = getWeekRange(now, -1);
  const weekTrips = tripsInRange(trips, thisWeek.start, thisWeek.end);
  const scopedInvoices = invoicesForTrips(invoices, weekTrips);

  const weeklyRevenue = invoiceRevenueInRange(scopedInvoices, thisWeek.start, thisWeek.end);
  const previousWeekRevenue = invoiceRevenueInRange(
    invoicesForTrips(invoices, tripsInRange(trips, lastWeek.start, lastWeek.end)),
    lastWeek.start,
    lastWeek.end
  );
  const completed = weekTrips.filter((trip) => trip.status === "completed").length;

  const dailyRevenue = WEEKDAY_LABELS.map((label, index) => {
    const day = startOfDay(new Date(thisWeek.start));
    day.setDate(thisWeek.start.getDate() + index);
    const dayEnd = endOfDay(day);
    return {
      label,
      revenue: invoiceRevenueInRange(scopedInvoices, day, dayEnd),
      isToday: isSameDay(day, now)
    };
  });

  return {
    weeklyRevenue,
    previousWeekRevenue,
    revenueChangePercent: percentChange(weeklyRevenue, previousWeekRevenue),
    dailyRevenue,
    trips: weekTrips.length,
    completed,
    revenue: weeklyRevenue
  };
}

export function locationHeroMetrics(
  trips: Trip[],
  invoices: Invoice[],
  period: DriverOverviewPeriod = "30d",
  now = new Date()
) {
  const { current } = overviewPeriodRanges(period, now);
  const periodTrips = tripsInRange(trips, current.start, current.end);
  const completed = periodTrips.filter((t) => t.status === "completed").length;
  const tripIds = new Set(periodTrips.map((t) => t.id));
  const periodInvoices = invoices.filter((inv) => inv.tripIDs.some((id) => tripIds.has(id)));
  const revenue = invoiceRevenueInRange(periodInvoices, current.start, current.end);

  return {
    trips: periodTrips.length,
    completed,
    revenue,
    periodLabel: overviewPeriodOption(period).label.toLowerCase()
  };
}

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
