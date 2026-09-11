const admin = require("firebase-admin");
const { HttpsError } = require("firebase-functions/v2/https");
const {
  isFeatureEnabled,
  isLocationFeatureEnabled,
  LICENSE_NOT_CONFIGURED_MESSAGE,
  PLANS_NOT_CONFIGURED_MESSAGE,
  FEATURE_IDS,
  LOCATION_OPS_FEATURE_IDS,
  FEATURE_LABELS,
  UNLIMITED,
  isFeatureId,
  isFeatureFlagValue,
} = require("./pricing");

const Collections = {
  appSettings: "app_settings",
};

const LICENSE_DOC = "license";
const PLANS_DOC = "plans";

function mapLicense(d) {
  const data = d || {};
  const intOrUnlimited = (key) =>
    data[key] != null && Number.isFinite(Number(data[key]))
      ? Math.trunc(Number(data[key]))
      : UNLIMITED;
  const maxLocations =
    data.maxLocations != null && Number.isFinite(Number(data.maxLocations))
      ? Math.trunc(Number(data.maxLocations))
      : 1;
  const featureFlags = {};
  const rawFlags = data.featureFlags;
  if (rawFlags && typeof rawFlags === "object" && !Array.isArray(rawFlags)) {
    for (const [key, value] of Object.entries(rawFlags)) {
      if (isFeatureId(key) && isFeatureFlagValue(value)) {
        featureFlags[key] = value;
      }
    }
  }
  return {
    planId: typeof data.planId === "string" ? data.planId.trim() : "",
    maxAdmins: intOrUnlimited("maxAdmins"),
    maxDrivers: intOrUnlimited("maxDrivers"),
    maxLocations,
    featureFlags,
  };
}

function mapPlansCatalog(d) {
  const data = d || {};
  const plans = {};
  const rawPlans = data.plans;
  if (rawPlans && typeof rawPlans === "object" && !Array.isArray(rawPlans)) {
    for (const [planId, value] of Object.entries(rawPlans)) {
      if (!planId.trim() || !value || typeof value !== "object" || Array.isArray(value)) {
        continue;
      }
      const features = Array.isArray(value.features)
        ? value.features.filter((f) => isFeatureId(f))
        : [];
      const label =
        typeof value.label === "string" && value.label.trim()
          ? value.label.trim()
          : planId;
      plans[planId] = { label, features };
    }
  }
  const defaultPlanId =
    typeof data.defaultPlanId === "string" && data.defaultPlanId.trim()
      ? data.defaultPlanId.trim()
      : "";
  if (!defaultPlanId || Object.keys(plans).length === 0) {
    throw new HttpsError("failed-precondition", PLANS_NOT_CONFIGURED_MESSAGE);
  }
  return { defaultPlanId, plans };
}

/**
 * Load `app_settings/license` and `app_settings/plans`.
 * Fail-closed: never invent a licence or plan catalog.
 * @param {FirebaseFirestore.Firestore} db
 * @returns {Promise<{ license: object, catalog: object }>}
 */
async function loadLicenseAndPlans(db) {
  const [licenseSnap, plansSnap] = await Promise.all([
    db.collection(Collections.appSettings).doc(LICENSE_DOC).get(),
    db.collection(Collections.appSettings).doc(PLANS_DOC).get(),
  ]);
  if (!licenseSnap.exists) {
    throw new HttpsError("failed-precondition", LICENSE_NOT_CONFIGURED_MESSAGE);
  }
  if (!plansSnap.exists) {
    throw new HttpsError("failed-precondition", PLANS_NOT_CONFIGURED_MESSAGE);
  }
  const license = mapLicense(licenseSnap.data());
  const catalog = mapPlansCatalog(plansSnap.data());
  return { license, catalog };
}

/**
 * Throws if corporate accounts feature is not enabled for the tenant.
 * @param {FirebaseFirestore.Firestore} db
 */
async function assertCorporateAccountsEnabled(db) {
  const { license, catalog } = await loadLicenseAndPlans(db);
  if (!isFeatureEnabled(license, catalog, "corporateAccounts")) {
    throw new HttpsError(
      "failed-precondition",
      "Corporate accounts are not enabled on this plan."
    );
  }
}

module.exports = {
  FEATURE_IDS,
  FEATURE_LABELS,
  LOCATION_OPS_FEATURE_IDS,
  UNLIMITED,
  LICENSE_NOT_CONFIGURED_MESSAGE,
  PLANS_NOT_CONFIGURED_MESSAGE,
  isFeatureId,
  isFeatureFlagValue,
  isFeatureEnabled,
  isLocationFeatureEnabled,
  mapLicense,
  mapPlansCatalog,
  loadLicenseAndPlans,
  assertCorporateAccountsEnabled,
};
