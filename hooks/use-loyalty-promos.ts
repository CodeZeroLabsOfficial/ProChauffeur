"use client";

import { useFeatureEnabled } from "@/hooks/use-feature-enabled";

/** Resolves whether Loyalty & promotional tools (`loyaltyPromos`) is enabled. */
export function useLoyaltyPromosEnabled(): {
  ready: boolean;
  enabled: boolean;
} {
  return useFeatureEnabled("loyaltyPromos");
}
