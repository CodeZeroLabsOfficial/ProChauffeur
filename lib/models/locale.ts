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
  /** Licence-class preset for this Location (`au` | `nz` | `uk` | `us` | `eu`). */
  operatorJurisdiction: string;
  /** Mapbox `country=` filter (ISO codes, comma-separated for multi-country). */
  mapboxJurisdiction: string;
}
