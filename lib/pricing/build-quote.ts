import { getMapboxToken } from "@/lib/env";
import { fetchRouteMetrics } from "@/lib/mapbox/directions";
import { requireDefaultGarageLocation, type FleetLocation } from "@/lib/models/location";
import type { OperatorLocale } from "@/lib/models/locale";
import type { PricingConfig } from "@/lib/models/pricing";
import type { QuoteRequest, QuoteResult } from "@/lib/models/quote";
import type { CoordinateField } from "@/lib/models/trip";
import { computeQuote } from "@/lib/pricing/quote-engine";
import { QuoteError } from "@/lib/pricing/errors";

async function routeMetrics(
  from: CoordinateField,
  to: CoordinateField,
  token: string
): Promise<{ distanceMeters: number; durationSeconds: number }> {
  const metrics = await fetchRouteMetrics(from, to, token);
  if (!metrics) {
    throw new QuoteError("Could not calculate route distance.");
  }
  return metrics;
}

export async function buildQuoteForRequest(
  request: QuoteRequest,
  pricing: PricingConfig,
  locale: OperatorLocale,
  locations: FleetLocation[]
): Promise<QuoteResult> {
  const garageLocation = requireDefaultGarageLocation(locations);
  const token = getMapboxToken();

  const onboard = await routeMetrics(request.pickup, request.dropoff, token);
  const garageToPickup = await routeMetrics(
    {
      latitude: garageLocation.latitude,
      longitude: garageLocation.longitude
    },
    request.pickup,
    token
  );
  const dropoffToGarage = await routeMetrics(
    request.dropoff,
    {
      latitude: garageLocation.latitude,
      longitude: garageLocation.longitude
    },
    token
  );

  return computeQuote(request, {
    pricing,
    locale,
    garageLocation,
    routeDistanceMeters: onboard.distanceMeters,
    deadheadDistanceMeters: garageToPickup.distanceMeters + dropoffToGarage.distanceMeters,
    deadheadDurationMinutes:
      (garageToPickup.durationSeconds + dropoffToGarage.durationSeconds) / 60
  });
}
