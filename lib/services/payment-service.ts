import { httpsCallable } from "firebase/functions";

import { firebaseFunctions } from "@/lib/firebase/client";

export type SendCustomerTripInvoiceResult = {
  invoiceId: string;
  stripeInvoiceId: string;
  hostedInvoiceUrl: string | null;
};

export async function sendCustomerTripInvoice(
  tripId: string
): Promise<SendCustomerTripInvoiceResult> {
  const callable = httpsCallable<{ tripId: string }, SendCustomerTripInvoiceResult>(
    firebaseFunctions(),
    "sendCustomerTripInvoice"
  );
  const result = await callable({ tripId });
  return result.data;
}

export type SyncCorporateStripeCustomerResult = {
  stripeCustomerId: string;
};

/** Create or update the Stripe Customer for a corporate account (admin callable). */
export async function syncCorporateStripeCustomer(
  corporateAccountId: string
): Promise<SyncCorporateStripeCustomerResult> {
  const callable = httpsCallable<
    { corporateAccountId: string },
    SyncCorporateStripeCustomerResult
  >(firebaseFunctions(), "syncCorporateStripeCustomer");
  const result = await callable({ corporateAccountId });
  return result.data;
}

export type GenerateCorporatePeriodInvoiceResult = {
  accountsProcessed: number;
  invoicesCreated: number;
  results: Array<{
    corporateAccountId: string;
    branchId: string;
    invoiceId: string;
    tripCount: number;
    total: number;
    stripeInvoiceId?: string;
    hostedInvoiceUrl?: string | null;
    stripeError?: string;
  }>;
};

/** Generate period invoice(s) for one corporate account (admin callable). */
export async function generateCorporatePeriodInvoice(
  corporateAccountId: string
): Promise<GenerateCorporatePeriodInvoiceResult> {
  const callable = httpsCallable<
    { corporateAccountId: string; force: boolean },
    GenerateCorporatePeriodInvoiceResult
  >(firebaseFunctions(), "generateCorporatePeriodInvoice");
  const result = await callable({ corporateAccountId, force: true });
  return result.data;
}

export type MarkInvoicePaidResult = {
  invoiceId: string;
  tripCount?: number;
  alreadyPaid?: boolean;
};

/** Mark a Firestore invoice paid and sync linked trips (admin callable). */
export async function markInvoicePaid(
  invoiceId: string,
  branchId?: string | null
): Promise<MarkInvoicePaidResult> {
  const callable = httpsCallable<
    { invoiceId: string; branchId?: string },
    MarkInvoicePaidResult
  >(firebaseFunctions(), "markInvoicePaid");
  const result = await callable({
    invoiceId,
    ...(branchId?.trim() ? { branchId: branchId.trim() } : {})
  });
  return result.data;
}
