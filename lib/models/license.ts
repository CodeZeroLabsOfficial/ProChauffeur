/** `app_settings/license` — plan, feature overrides, and capacity caps. */

export const FEATURE_IDS = [
  "autoDispatch",
  "bookingValidation",
  "driverRatings",
  "dynamicPricing",
  "loyaltyPromos",
  "corporateAccounts"
] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

/** License features that also require a per-Location switch (`branches/{id}`). */
export const LOCATION_OPS_FEATURE_IDS = [
  "autoDispatch",
  "dynamicPricing",
  "bookingValidation"
] as const;

export type LocationOpsFeatureId = (typeof LOCATION_OPS_FEATURE_IDS)[number];

export const LOCATION_OPS_FEATURE_COPY: Record<
  LocationOpsFeatureId,
  { title: string; description: string }
> = {
  autoDispatch: {
    title: "Auto-Dispatch",
    description:
      "Automatically assign incoming jobs to the nearest available chauffeur with the right vehicle."
  },
  dynamicPricing: {
    title: "Dynamic pricing",
    description: "Adjust fares from demand and time of day."
  },
  bookingValidation: {
    title: "Booking validation",
    description: "Block bookings outside hours or service rules."
  }
};

export type FeatureFlagValue = "inherit" | "forceOn" | "forceOff";

/** How a feature resolved for display (License settings). */
export type FeatureSource = "plan" | "addon" | "not_included" | "disabled";

export const FEATURE_LABELS: Record<FeatureId, string> = {
  autoDispatch: "Auto-Dispatch",
  bookingValidation: "Booking Validation",
  driverRatings: "Driver ratings",
  dynamicPricing: "Dynamic trip pricing",
  loyaltyPromos: "Loyalty & promotional tools",
  corporateAccounts: "Accounts"
};

export interface PlanDefinition {
  label: string;
  features: FeatureId[];
}

/** `app_settings/plans` — catalog of planId → included features. */
export interface AppPlansCatalog {
  defaultPlanId: string;
  plans: Record<string, PlanDefinition>;
}

export interface AppLicense {
  planId: string;
  maxAdmins: number;
  maxDrivers: number;
  maxLocations: number;
  featureFlags: Partial<Record<FeatureId, FeatureFlagValue>>;
}

/** Sentinel used when a numeric cap field is absent (admins/drivers decay to unlimited). */
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

/**
 * Default when the license document is missing or fetch fails.
 * `maxLocations` defaults to 1 so multi-Location stays off until explicitly raised.
 * No plan / features until configured.
 */
export const defaultLicense: AppLicense = {
  planId: "",
  maxAdmins: UNLIMITED,
  maxDrivers: UNLIMITED,
  maxLocations: 1,
  featureFlags: {}
};

/** In-app catalog when `app_settings/plans` is missing. */
export const defaultPlansCatalog: AppPlansCatalog = {
  defaultPlanId: "professional",
  plans: {
    essentials: {
      label: "Essentials",
      features: ["driverRatings"]
    },
    professional: {
      label: "Professional",
      features: ["driverRatings", "corporateAccounts"]
    },
    premium: {
      label: "Premium",
      features: [
        "autoDispatch",
        "bookingValidation",
        "driverRatings",
        "dynamicPricing",
        "loyaltyPromos",
        "corporateAccounts"
      ]
    }
  }
};

export function isFeatureId(value: string): value is FeatureId {
  return (FEATURE_IDS as readonly string[]).includes(value);
}

export function isFeatureFlagValue(value: unknown): value is FeatureFlagValue {
  return value === "inherit" || value === "forceOn" || value === "forceOff";
}

function planIncludes(catalog: AppPlansCatalog, planId: string, feature: FeatureId): boolean {
  const id = planId.trim() || catalog.defaultPlanId;
  const plan = catalog.plans[id];
  if (!plan) return false;
  return plan.features.includes(feature);
}

/** Effective entitlement: forceOff → off; forceOn → on; else inherit from plan catalog. */
export function isFeatureEnabled(
  license: AppLicense,
  catalog: AppPlansCatalog,
  feature: FeatureId
): boolean {
  const flag = license.featureFlags[feature] ?? "inherit";
  if (flag === "forceOff") return false;
  if (flag === "forceOn") return true;
  return planIncludes(catalog, license.planId, feature);
}

/** Location field for an ops feature. Missing / not `true` is off. */
export function locationOpsFeatureField(
  feature: LocationOpsFeatureId
): "autoDispatchEnabled" | "dynamicPricingEnabled" | "bookingValidationEnabled" {
  switch (feature) {
    case "autoDispatch":
      return "autoDispatchEnabled";
    case "dynamicPricing":
      return "dynamicPricingEnabled";
    case "bookingValidation":
      return "bookingValidationEnabled";
  }
}

export type LocationOpsFlags = {
  autoDispatchEnabled: boolean;
  dynamicPricingEnabled: boolean;
  bookingValidationEnabled: boolean;
};

/**
 * Runtime check: company license allows the feature AND this Location has it on.
 * Missing Location flags are off.
 */
export function isLocationFeatureEnabled(
  license: AppLicense,
  catalog: AppPlansCatalog,
  flags: LocationOpsFlags,
  feature: LocationOpsFeatureId
): boolean {
  if (!isFeatureEnabled(license, catalog, feature)) return false;
  return flags[locationOpsFeatureField(feature)] === true;
}

/** Display source for License UI. */
export function featureSource(
  license: AppLicense,
  catalog: AppPlansCatalog,
  feature: FeatureId
): FeatureSource {
  const flag = license.featureFlags[feature] ?? "inherit";
  if (flag === "forceOff") return "disabled";
  if (flag === "forceOn") return "addon";
  if (planIncludes(catalog, license.planId, feature)) return "plan";
  return "not_included";
}

export function planLabel(license: AppLicense, catalog: AppPlansCatalog): string {
  const id = license.planId.trim();
  if (id && catalog.plans[id]?.label) return catalog.plans[id].label;
  if (catalog.defaultPlanId && catalog.plans[catalog.defaultPlanId]?.label) {
    return catalog.plans[catalog.defaultPlanId].label;
  }
  return "";
}

/** Multi-Location UI (switcher / create) is on when the license allows more than one Location. */
export function isMultiLocationEnabled(maxLocations: number): boolean {
  return maxLocations > 1;
}

/** Whether another Location (branch) may be created under the current cap. */
export function canCreateLocation(used: number, maxLocations: number): boolean {
  if (maxLocations >= UNLIMITED) return true;
  return used < maxLocations;
}

/** Whether another chauffeur user may be added under the current cap. */
export function canAddDriver(used: number, maxDrivers: number): boolean {
  if (maxDrivers >= UNLIMITED) return true;
  return used < maxDrivers;
}

export function capLabel(value: number): string {
  return value >= UNLIMITED ? "Unlimited" : String(value);
}

export function usagePercent(used: number, max: number): number {
  if (max >= UNLIMITED || max <= 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}
