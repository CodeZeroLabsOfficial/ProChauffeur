import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";
import { tripPickupReferenceDate } from "@/lib/models/trip";

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

export function formatPercentChange(value: number | null): string {
  if (value === null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function timeAgo(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export function tripsInRange(trips: Trip[], start: Date, end: Date) {
  return trips.filter((trip) => {
    const ref = tripPickupReferenceDate(trip);
    return ref >= start && ref <= end;
  });
}

export function invoiceRevenueInRange(invoices: Invoice[], start: Date, end: Date) {
  return invoices
    .filter(
      (invoice) =>
        invoice.status === "paid" &&
        invoice.paidAt &&
        invoice.paidAt >= start &&
        invoice.paidAt <= end
    )
    .reduce((sum, invoice) => sum + invoice.total, 0);
}

export function getWeekRange(reference: Date, offsetWeeks = 0) {
  const start = startOfDay(reference);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset + offsetWeeks * 7);
  const end = endOfDay(new Date(start));
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export function getMonthRange(reference: Date, offsetMonths = 0) {
  const start = startOfDay(new Date(reference.getFullYear(), reference.getMonth() + offsetMonths, 1));
  const end = endOfDay(new Date(reference.getFullYear(), reference.getMonth() + offsetMonths + 1, 0));
  return { start, end };
}

export function bookingStatusCounts(trips: Trip[]) {
  let confirmed = 0;
  let active = 0;
  let completed = 0;
  for (const trip of trips) {
    if (trip.status === "requested" || trip.status === "accepted") {
      confirmed += 1;
    } else if (trip.status === "en_route_pickup" || trip.status === "in_progress") {
      active += 1;
    } else if (trip.status === "completed") {
      completed += 1;
    }
  }
  return { confirmed, active, completed };
}
