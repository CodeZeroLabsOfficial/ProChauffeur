import type { DistanceUnit, TaxDisplayMode } from "@/lib/models/enums";
import { DEFAULT_DRIVER_LICENCE_COUNTRY } from "@/lib/models/driver-licence-presets";

/** `app_settings/locale` — fleet regional and presentation preferences. All fields required. */
export interface OperatorLocale {
  locale: string;
  currency: string;
  timezone: string;
  distanceUnit: DistanceUnit;
  defaultTaxRate: number;
  taxName: string;
  taxDisplayMode: TaxDisplayMode;
  showTaxOnQuotes: boolean;
  /** Country preset that supplies driver licence class options. */
  driverLicenceCountry: string;
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
    showTaxOnQuotes: false,
    driverLicenceCountry: DEFAULT_DRIVER_LICENCE_COUNTRY
  };
}
