import type { DistanceUnit, TaxDisplayMode } from "@/lib/models/enums";

/** `branches/{branchId}/settings/locale` — location regional and tax preferences. All fields required. */
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
