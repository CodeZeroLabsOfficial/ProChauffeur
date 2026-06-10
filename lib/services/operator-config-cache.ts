import type { OperatorLocale } from "@/lib/models/locale";
import type { PricingConfig } from "@/lib/models/pricing";
import {
  fetchOperatorLocale,
  fetchPricingConfiguration
} from "@/lib/services/firebase-service";

let pricingCache: Promise<PricingConfig> | null = null;
let localeCache: Promise<OperatorLocale> | null = null;

export function getCachedPricingConfiguration(): Promise<PricingConfig> {
  if (!pricingCache) {
    pricingCache = fetchPricingConfiguration();
  }
  return pricingCache;
}

export function getCachedOperatorLocale(): Promise<OperatorLocale> {
  if (!localeCache) {
    localeCache = fetchOperatorLocale();
  }
  return localeCache;
}

export function invalidatePricingConfigurationCache(): void {
  pricingCache = null;
}

export function invalidateOperatorLocaleCache(): void {
  localeCache = null;
}
