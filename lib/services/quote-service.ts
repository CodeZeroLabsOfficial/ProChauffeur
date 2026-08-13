import { httpsCallable } from "firebase/functions";

import { firebaseFunctions } from "@/lib/firebase/client";
import type { CorporateAllowedPayment } from "@/lib/models";
import type { QuoteLineItem, QuoteResult, TripQuoteSnapshot } from "@/lib/models/quote";
import type { CoordinateField } from "@/lib/models/trip";
import type { TripType } from "@/lib/models/enums";

/** Flat quote inputs used by the dashboard; wrapped into nested journey/quote for the callable. */
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
  branchId: string;
  customerId: string;
  settlement: CorporateAllowedPayment;
  trip: ComputeQuoteTripInput;
  promoCode?: string | null;
};

/** Nested trip payload expected by the `computeQuote` Cloud Function. */
type ComputeQuoteNestedTrip = {
  journey: {
    tripType: TripType;
    pickup: CoordinateField;
    dropoff: CoordinateField;
    pickupAddressLine: string;
    dropoffAddressLine: string;
    scheduledPickupAt: string;
    bookedHours: number | null;
    addonIds: string[];
  };
  quote: {
    vehicleClassId: string;
  };
};

type ComputeQuoteRemoteResult = Omit<QuoteResult, "snapshot"> & {
  snapshot: Omit<TripQuoteSnapshot, "scheduledPickupAt"> & {
    scheduledPickupAt: string | Date;
  };
};

function nestedTripPayload(trip: ComputeQuoteTripInput): ComputeQuoteNestedTrip {
  return {
    journey: {
      tripType: trip.tripType,
      pickup: trip.pickup,
      dropoff: trip.dropoff,
      pickupAddressLine: trip.pickupAddressLine,
      dropoffAddressLine: trip.dropoffAddressLine,
      scheduledPickupAt: trip.scheduledPickupAt.toISOString(),
      bookedHours: trip.bookedHours,
      addonIds: trip.addonIds
    },
    quote: {
      vehicleClassId: trip.vehicleClassId
    }
  };
}

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
      trip: ComputeQuoteNestedTrip;
      promoCode?: string | null;
    },
    ComputeQuoteRemoteResult
  >(firebaseFunctions(), "computeQuote");

  const result = await callable({
    branchId: request.branchId,
    customerId: request.customerId,
    settlement: request.settlement,
    promoCode: request.promoCode ?? null,
    trip: nestedTripPayload(request.trip)
  });
  return reviveQuoteResult(result.data);
}
