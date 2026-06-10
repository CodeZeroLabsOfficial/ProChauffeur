import type { DistanceUnit, TaxDisplayMode } from "@/lib/models/enums";

/** `operator/locale` — fleet regional and presentation preferences. All fields required. */
export interface OperatorLocale {
  locale: string;
  currency: string;
  timezone: string;
  distanceUnit: DistanceUnit;
  defaultTaxRate: number;
  taxName: string;
  taxDisplayMode: TaxDisplayMode;
  showTaxOnQuotes: boolean;
}

/** Admin setup template only — not used at runtime when fetching config. */
export function buildInitialOperatorLocale(): OperatorLocale {
  return {
    locale: "en-AU",
    currency: "AUD",
    timezone: "Australia/Sydney",
    distanceUnit: "km",
    defaultTaxRate: 0.1,
    taxName: "GST",
    taxDisplayMode: "exclusive",
    showTaxOnQuotes: false
  };
}
