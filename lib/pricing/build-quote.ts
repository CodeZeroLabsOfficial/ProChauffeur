import { getActiveBranchId } from "@/lib/branch/active-branch-store";
import { getMapboxToken } from "@/lib/env";
import { fetchRouteMetrics } from "@/lib/mapbox/directions";
import { isFeatureEnabled, isLocationFeatureEnabled } from "@/lib/models";
import { requireDefaultOfficeLocation, type FleetLocation } from "@/lib/models/location";
import type { OperatorLocale } from "@/lib/models/locale";
import type { PricingConfig } from "@/lib/models/pricing";
import type { VehicleClass } from "@/lib/models/vehicle-class";
import type { QuoteRequest, QuoteResult } from "@/lib/models/quote";
import type { CoordinateField } from "@/lib/models/trip";
import { buildTripQuote } from "@/lib/pricing/quote-engine";
import { QuoteError } from "@/lib/pricing/errors";
import {
  getCachedRouteMetrics,
  setCachedRouteMetrics,
  type RouteMetrics
} from "@/lib/pricing/route-metrics-cache";
import {
  fetchBranch,
  fetchLicense,
  fetchPlansCatalog
} from "@/lib/services/firebase-service";

async function routeMetrics(
  from: CoordinateField,
  to: CoordinateField,
  token: string
): Promise<RouteMetrics> {
  const cached = getCachedRouteMetrics(from, to);
  if (cached) return cached;

  const metrics = await fetchRouteMetrics(from, to, token);
  if (!metrics) {
    throw new QuoteError("Could not calculate route distance.");
  }
  setCachedRouteMetrics(from, to, metrics);
  return metrics;
}

export async function buildQuoteForRequest(
  request: QuoteRequest,
  pricing: PricingConfig,
  locale: OperatorLocale,
  locations: FleetLocation[],
  vehicleClass: VehicleClass
): Promise<QuoteResult> {
  const branchId = getActiveBranchId();
  const [license, plans, branch] = await Promise.all([
    fetchLicense(),
    fetchPlansCatalog(),
    branchId ? fetchBranch(branchId) : Promise.resolve(null)
  ]);

  let gatedRequest = request;
  if (request.corporateAccount && !isFeatureEnabled(license, plans, "corporateAccounts")) {
    gatedRequest = { ...request, corporateAccount: null };
  }

  const dynamicPricingActive = isLocationFeatureEnabled(
    license,
    plans,
    {
      autoDispatchEnabled: branch?.autoDispatchEnabled === true,
      dynamicPricingEnabled: branch?.dynamicPricingEnabled === true,
      bookingValidationEnabled: branch?.bookingValidationEnabled === true
    },
    "dynamicPricing"
  );

  const officeLocation = requireDefaultOfficeLocation(locations);
  const token = getMapboxToken();
  const officeCoord = {
    latitude: officeLocation.latitude,
    longitude: officeLocation.longitude
  };

  const [onboard, officeToPickup, dropoffToOffice] = await Promise.all([
    routeMetrics(gatedRequest.pickup, gatedRequest.dropoff, token),
    routeMetrics(officeCoord, gatedRequest.pickup, token),
    routeMetrics(gatedRequest.dropoff, officeCoord, token)
  ]);

  return buildTripQuote(gatedRequest, {
    pricing,
    locale,
    vehicleClass,
    officeLocation,
    routeDistanceMeters: onboard.distanceMeters,
    deadheadDistanceMeters: officeToPickup.distanceMeters + dropoffToOffice.distanceMeters,
    deadheadDurationMinutes:
      (officeToPickup.durationSeconds + dropoffToOffice.durationSeconds) / 60,
    dynamicPricingActive
  });
}
