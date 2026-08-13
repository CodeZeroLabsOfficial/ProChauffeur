import type { OperatorLocale } from "@/lib/models/locale";
import type { PricingConfig } from "@/lib/models/pricing";
import {
  fetchOperatorLocale,
  fetchPricingConfiguration
} from "@/lib/services/firebase-service";

let pricingCache: Promise<PricingConfig> | null = null;
const localeCache = new Map<string, Promise<OperatorLocale>>();

export function getCachedPricingConfiguration(): Promise<PricingConfig> {
  if (!pricingCache) {
    pricingCache = fetchPricingConfiguration();
  }
  return pricingCache;
}

export function getCachedOperatorLocale(branchId: string): Promise<OperatorLocale> {
  const existing = localeCache.get(branchId);
  if (existing) return existing;
  const next = fetchOperatorLocale(branchId);
  localeCache.set(branchId, next);
  return next;
}

export function invalidatePricingConfigurationCache(): void {
  pricingCache = null;
}

export function invalidateOperatorLocaleCache(branchId?: string): void {
  if (branchId) {
    localeCache.delete(branchId);
    return;
  }
  localeCache.clear();
}
