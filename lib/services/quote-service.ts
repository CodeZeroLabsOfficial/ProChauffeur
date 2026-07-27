import { httpsCallable } from "firebase/functions";

import { getActiveBranchId } from "@/lib/branch/active-branch-store";
import { firebaseFunctions } from "@/lib/firebase/client";
import type { CorporateAllowedPayment } from "@/lib/models";
import type { QuoteLineItem, QuoteResult, TripQuoteSnapshot } from "@/lib/models/quote";
import type { CoordinateField } from "@/lib/models/trip";
import type { TripType } from "@/lib/models/enums";

export type ComputeQuoteTripInput = {
  tripType: TripType;
  vehicleClassId: string;
  pickup: CoordinateField;
  dropoff: CoordinateField;
  pickupAddressLine: string;
  dropoffAddressLine: string;
  pickupPostcode: string;
  dropoffPostcode: string;
  scheduledPickupAt: Date;
  bookedHours: number | null;
  addonIds: string[];
};

export type ComputeQuoteRequest = {
  branchId?: string;
  customerId: string;
  settlement: CorporateAllowedPayment;
  trip: ComputeQuoteTripInput;
  promoCode?: string | null;
};

type ComputeQuoteRemoteResult = Omit<QuoteResult, "snapshot"> & {
  snapshot: Omit<TripQuoteSnapshot, "scheduledPickupAt"> & {
    scheduledPickupAt: string | Date;
  };
};

function reviveQuoteResult(raw: ComputeQuoteRemoteResult): QuoteResult {
  const scheduled = raw.snapshot?.scheduledPickupAt;
  const scheduledPickupAt =
    scheduled instanceof Date
      ? scheduled
      : typeof scheduled === "string"
        ? new Date(scheduled)
        : new Date();
  return {
    ...raw,
    breakdown: Array.isArray(raw.breakdown) ? (raw.breakdown as QuoteLineItem[]) : [],
    snapshot: {
      ...raw.snapshot,
      scheduledPickupAt
    }
  };
}

/** Server quote with corporate rates (and optional promo when retail settlement path). */
export async function computeQuoteRemote(request: ComputeQuoteRequest): Promise<QuoteResult> {
  const callable = httpsCallable<
    {
      branchId: string;
      customerId: string;
      settlement: CorporateAllowedPayment;
      trip: Omit<ComputeQuoteTripInput, "scheduledPickupAt"> & { scheduledPickupAt: string };
      promoCode?: string | null;
    },
    ComputeQuoteRemoteResult
  >(firebaseFunctions(), "computeQuote");

  const result = await callable({
    branchId: request.branchId ?? getActiveBranchId(),
    customerId: request.customerId,
    settlement: request.settlement,
    promoCode: request.promoCode ?? null,
    trip: {
      ...request.trip,
      scheduledPickupAt: request.trip.scheduledPickupAt.toISOString()
    }
  });
  return reviveQuoteResult(result.data);
}
