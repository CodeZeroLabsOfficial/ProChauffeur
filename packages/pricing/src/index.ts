/** Shared license entitlements and QuoteEngine fare math. */
export {
  FEATURE_IDS,
  LOCATION_OPS_FEATURE_IDS,
  LOCATION_OPS_FEATURE_COPY,
  FEATURE_LABELS,
  UNLIMITED,
  LICENSE_NOT_CONFIGURED_MESSAGE,
  PLANS_NOT_CONFIGURED_MESSAGE,
  isFeatureId,
  isFeatureFlagValue,
  isFeatureEnabled,
  locationOpsFeatureField,
  isLocationFeatureEnabled,
  featureSource,
  planLabel,
  isMultiLocationEnabled,
  canCreateLocation,
  canAddDriver,
  capLabel,
  usagePercent,
  type FeatureId,
  type LocationOpsFeatureId,
  type FeatureFlagValue,
  type FeatureSource,
  type PlanDefinition,
  type AppPlansCatalog,
  type AppLicense,
  type LocationOpsFlags
} from "./license";

export { ConfigError, QuoteError } from "./errors";
export { metersToDistanceUnit, distanceUnitLabel } from "./distance";
export {
  findCorporateFixedOverride,
  applyCorporateFixedRatesToVehicleClass,
  applyCorporatePercentOffLayer
} from "./apply-corporate-rate";
export { applyPromoDiscountLayer } from "./apply-promo";
export { buildTripQuote, type QuoteEngineContext } from "./quote-engine";
