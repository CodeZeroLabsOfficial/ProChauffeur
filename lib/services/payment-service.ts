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
