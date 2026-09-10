"use client";

import { useEffect, useState } from "react";

import {
  isFeatureEnabled,
  type AppLicense,
  type AppPlansCatalog,
  type FeatureId
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
