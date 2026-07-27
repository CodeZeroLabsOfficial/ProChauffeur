import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";

/**
 * Account spend helpers for the corporate profile sidebar.
 * Booking-time credit/budget enforcement (route to accountManagerUserId) is deferred
 * until the customer portal ships.
 */

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function tripIsCancelled(trip: Trip): boolean {
  return trip.status === "cancelled";
}

/** Month-to-date on-account / corporate spend. */
export function corporateMonthlySpend(
  trips: Trip[],
  accountId: string,
  now: Date = new Date()
): number {
  const from = startOfMonth(now).getTime();
  const to = endOfMonth(now).getTime();
  let sum = 0;
  for (const trip of trips) {
    if (trip.corporateAccountId !== accountId) continue;
    if (tripIsCancelled(trip)) continue;
    if (trip.paymentStatus !== "on_account" && trip.paymentStatus !== "invoiced") continue;
    const at = (trip.createdAt ?? trip.scheduledPickupAt ?? now).getTime();
    if (at < from || at > to) continue;
    const amount = trip.quotedTotal;
    if (typeof amount === "number" && Number.isFinite(amount)) sum += amount;
  }
  return sum;
}

/** Open credit exposure: unpaid corporate invoices + open on_account trips. */
export function corporateOpenExposure(
  trips: Trip[],
  invoices: Invoice[],
  accountId: string
): number {
  let sum = 0;
  for (const invoice of invoices) {
    if (invoice.corporateAccountId !== accountId) continue;
    if (invoice.status !== "sent" && invoice.status !== "overdue") continue;
    if (typeof invoice.total === "number" && Number.isFinite(invoice.total)) {
      sum += invoice.total;
    }
  }
  for (const trip of trips) {
    if (trip.corporateAccountId !== accountId) continue;
    if (tripIsCancelled(trip)) continue;
    if (trip.paymentStatus !== "on_account") continue;
    if (trip.invoiceId) continue;
    const amount = trip.quotedTotal;
    if (typeof amount === "number" && Number.isFinite(amount)) sum += amount;
  }
  return sum;
}
