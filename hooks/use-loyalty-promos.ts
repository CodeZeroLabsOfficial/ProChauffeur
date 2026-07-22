"use client";

import { useEffect, useState } from "react";

import {
  defaultLicense,
  defaultPlansCatalog,
  isFeatureEnabled,
  type AppLicense,
  type AppPlansCatalog
} from "@/lib/models";
import { fetchLicense, fetchPlansCatalog } from "@/lib/services/firebase-service";

/** Resolves whether Loyalty & promotional tools (`loyaltyPromos`) is enabled. */
export function useLoyaltyPromosEnabled(): {
  ready: boolean;
  enabled: boolean;
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
        setLicense(defaultLicense);
        setPlans(defaultPlansCatalog);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const enabled = isFeatureEnabled(
    license ?? defaultLicense,
    plans ?? defaultPlansCatalog,
    "loyaltyPromos"
  );

  return { ready, enabled };
}
