const { HttpsError } = require("firebase-functions/v2/https");

const FEATURE_IDS = [
  "autoDispatch",
  "bookingValidation",
  "driverRatings",
  "dynamicPricing",
  "loyaltyPromos",
  "corporateAccounts",
];

const FEATURE_LABELS = {
  autoDispatch: "Auto-Dispatch",
  bookingValidation: "Booking Validation",
  driverRatings: "Driver ratings",
  dynamicPricing: "Dynamic trip pricing",
  loyaltyPromos: "Loyalty & promotional tools",
  corporateAccounts: "Accounts",
};

const UNLIMITED = Number.MAX_SAFE_INTEGER;

const defaultLicense = {
  planId: "",
  maxAdmins: UNLIMITED,
  maxDrivers: UNLIMITED,
  maxLocations: 1,
  featureFlags: {},
};

const defaultPlansCatalog = {
  defaultPlanId: "professional",
  plans: {
    essentials: {
      label: "Essentials",
      features: ["driverRatings"],
    },
    professional: {
      label: "Professional",
      features: ["driverRatings", "corporateAccounts"],
    },
    premium: {
      label: "Premium",
      features: [
        "autoDispatch",
        "bookingValidation",
        "driverRatings",
        "dynamicPricing",
        "loyaltyPromos",
        "corporateAccounts",
      ],
    },
  },
};

function isFeatureId(value) {
  return FEATURE_IDS.includes(value);
}

function isFeatureFlagValue(value) {
  return value === "inherit" || value === "forceOn" || value === "forceOff";
}

function planIncludes(catalog, planId, feature) {
  const id = (planId || "").trim() || catalog.defaultPlanId;
  const plan = catalog.plans[id];
  if (!plan) return false;
  return Array.isArray(plan.features) && plan.features.includes(feature);
}

/** Effective entitlement: forceOff → off; forceOn → on; else inherit from plan catalog. */
function isFeatureEnabled(license, catalog, feature) {
  const flag =
    (license && license.featureFlags && license.featureFlags[feature]) || "inherit";
  if (flag === "forceOff") return false;
  if (flag === "forceOn") return true;
  return planIncludes(catalog, license.planId, feature);
}

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
      : defaultPlansCatalog.defaultPlanId;
  if (Object.keys(plans).length === 0) {
    return defaultPlansCatalog;
  }
  return { defaultPlanId, plans };
}

/**
 * Load `app_settings/license` and `app_settings/plans`.
 * @param {FirebaseFirestore.Firestore} db
 * @returns {Promise<{ license: object, catalog: object }>}
 */
async function loadLicenseAndPlans(db) {
  const [licenseSnap, plansSnap] = await Promise.all([
    db.collection("app_settings").doc("license").get(),
    db.collection("app_settings").doc("plans").get(),
  ]);
  const license = licenseSnap.exists ? mapLicense(licenseSnap.data()) : defaultLicense;
  const catalog = plansSnap.exists ? mapPlansCatalog(plansSnap.data()) : defaultPlansCatalog;
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
  UNLIMITED,
  defaultLicense,
  defaultPlansCatalog,
  isFeatureId,
  isFeatureFlagValue,
  isFeatureEnabled,
  mapLicense,
  mapPlansCatalog,
  loadLicenseAndPlans,
  assertCorporateAccountsEnabled,
};
