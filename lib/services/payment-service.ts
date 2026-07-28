import { httpsCallable } from "firebase/functions";

import { firebaseFunctions } from "@/lib/firebase/client";

export type CreateInvoiceForTripResult = {
  invoiceId: string;
  stripeInvoiceId: string;
  hostedInvoiceUrl: string | null;
};

export async function createInvoiceForTrip(tripId: string): Promise<CreateInvoiceForTripResult> {
  const callable = httpsCallable<{ tripId: string }, CreateInvoiceForTripResult>(
    firebaseFunctions(),
    "createInvoiceForTrip"
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
  }>;
};

/** Generate period invoice(s) for one corporate account (admin callable). */
export async function generateCorporatePeriodInvoice(
  corporateAccountId: string
): Promise<GenerateCorporatePeriodInvoiceResult> {
  const callable = httpsCallable<
    { corporateAccountId: string; force: boolean },
    GenerateCorporatePeriodInvoiceResult
  >(firebaseFunctions(), "consolidateCorporateInvoicesManual");
  const result = await callable({ corporateAccountId, force: true });
  return result.data;
}
