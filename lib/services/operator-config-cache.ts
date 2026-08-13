import type { OperatorLocale } from "@/lib/models/locale";
import type { PricingConfig } from "@/lib/models/pricing";
import {
  fetchOperatorLocale,
  fetchPricingConfiguration
} from "@/lib/services/firebase-service";

const pricingCache = new Map<string, Promise<PricingConfig>>();
const localeCache = new Map<string, Promise<OperatorLocale>>();

export function getCachedPricingConfiguration(branchId: string): Promise<PricingConfig> {
  const existing = pricingCache.get(branchId);
  if (existing) return existing;
  const next = fetchPricingConfiguration(branchId);
  pricingCache.set(branchId, next);
  return next;
}

export function getCachedOperatorLocale(branchId: string): Promise<OperatorLocale> {
  const existing = localeCache.get(branchId);
  if (existing) return existing;
  const next = fetchOperatorLocale(branchId);
  localeCache.set(branchId, next);
  return next;
}

export function invalidatePricingConfigurationCache(branchId?: string): void {
  if (branchId) {
    pricingCache.delete(branchId);
    return;
  }
  pricingCache.clear();
}

export function invalidateOperatorLocaleCache(branchId?: string): void {
  if (branchId) {
    localeCache.delete(branchId);
    return;
  }
  localeCache.clear();
}
