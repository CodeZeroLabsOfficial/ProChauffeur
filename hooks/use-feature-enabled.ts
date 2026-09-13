"use client";

import { useEffect, useMemo, useState } from "react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import {
  isFeatureEnabled,
  isLocationFeatureEnabled,
  type AppLicense,
  type AppPlansCatalog,
  type FeatureId,
  type LocationOpsFeatureId
} from "@/lib/models";
import { fetchLicense, fetchPlansCatalog } from "@/lib/services/firebase-service";

/** License + plans catalog for resolving feature entitlements. */
export function useLicenseEntitlements(): {
  ready: boolean;
  license: AppLicense | null;
  plans: AppPlansCatalog | null;
  isEnabled: (feature: FeatureId) => boolean;
} {
  const [license, setLicense] = useState<AppLicense | null>(null);
  const [plans, setPlans] = useState<AppPlansCatalog | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchLicense(), fetchPlansCatalog()])
      .then(([nextLicense, nextPlans]) => {
        if (cancelled) return;
        setLicense(nextLicense);
        setPlans(nextPlans);
      })
      .catch(() => {
        if (cancelled) return;
        setLicense(null);
        setPlans(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ready,
    license,
    plans,
    // Fail closed until both load — never invent a licence.
    isEnabled: (feature: FeatureId) =>
      ready && license && plans ? isFeatureEnabled(license, plans, feature) : false
  };
}

/** Resolves whether a single feature is enabled on the current license. */
export function useFeatureEnabled(feature: FeatureId): {
  ready: boolean;
  enabled: boolean;
} {
  const { ready, isEnabled } = useLicenseEntitlements();
  return { ready, enabled: isEnabled(feature) };
}

/**
 * Company license allows the feature AND the active Location switch is on.
 * Missing Location flags are off.
 */
export function useLocationFeatureEnabled(feature: LocationOpsFeatureId): {
  ready: boolean;
  enabled: boolean;
} {
  const { ready, license, plans } = useLicenseEntitlements();
  const { activeBranch, branchesLoading } = useActiveBranch();

  const enabled = useMemo(() => {
    if (!ready || !license || !plans || !activeBranch) return false;
    return isLocationFeatureEnabled(
      license,
      plans,
      {
        autoDispatchEnabled: activeBranch.autoDispatchEnabled === true,
        dynamicPricingEnabled: activeBranch.dynamicPricingEnabled === true,
        bookingValidationEnabled: activeBranch.bookingValidationEnabled === true,
        driverRatingsEnabled: activeBranch.driverRatingsEnabled === true
      },
      feature
    );
  }, [ready, license, plans, activeBranch, feature]);

  return { ready: ready && !branchesLoading, enabled };
}
