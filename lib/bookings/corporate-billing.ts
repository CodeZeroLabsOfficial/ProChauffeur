import type { CorporateAccount, CorporateBillingDay, User } from "@/lib/models";
import type { Trip } from "@/lib/models/trip";

/**
 * Invoice / Stripe email for a corporate account.
 * Prefer accounts inbox, then company email, then billing contact.
 */
export function resolveCorporateInvoiceEmail(
  account: Pick<CorporateAccount, "billingEmail" | "email">,
  billingContact?: Pick<User, "email"> | null
): string | null {
  const billingEmail = account.billingEmail?.trim();
  if (billingEmail) return billingEmail;
  const companyEmail = account.email?.trim();
  if (companyEmail) return companyEmail;
  const contactEmail = billingContact?.email?.trim();
  if (contactEmail) return contactEmail;
  return null;
}

export function formatCorporateBillingDay(day: CorporateBillingDay): string {
  if (day === "last") return "Last day of month";
  return `Day ${day} of month`;
}

/** Calendar month-to-date window used for period invoices (matches Cloud Function). */
export function corporateBillingPeriodRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

function tripReferenceTime(trip: Trip, fallback: Date): Date {
  return trip.createdAt ?? trip.journey.scheduledPickupAt ?? fallback;
}

/**
 * Unbilled corporate trips ready for a period invoice.
 * Matches Cloud Function: on_account, no invoiceId (cancelled excluded in UI).
 */
export function unbilledCorporateTrips(trips: Trip[], accountId: string): Trip[] {
  const now = new Date();
  return trips
    .filter((trip) => {
      if (trip.billing.corporateAccountId !== accountId) return false;
      if (trip.status === "cancelled") return false;
      if (trip.billing.paymentStatus !== "on_account") return false;
      if (trip.billing.invoiceId) return false;
      return true;
    })
    .sort(
      (a, b) =>
        tripReferenceTime(b, now).getTime() - tripReferenceTime(a, now).getTime()
    );
}

export function sumTripQuotedTotals(trips: Trip[]): number {
  let sum = 0;
  for (const trip of trips) {
    const amount = trip.quote.quotedTotal;
    if (typeof amount === "number" && Number.isFinite(amount)) sum += amount;
  }
  return sum;
}
