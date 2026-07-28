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
