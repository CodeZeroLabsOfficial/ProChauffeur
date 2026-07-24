/** Country presets that supply driver licence class and jurisdiction options. */

export type DriverLicenceClassOption = {
  value: string;
  label: string;
};

export type DriverLicenceJurisdictionOption = {
  value: string;
  label: string;
};

export type DriverLicenceCountryPreset = {
  id: string;
  label: string;
  classes: DriverLicenceClassOption[];
  jurisdictions: DriverLicenceJurisdictionOption[];
};

export const DRIVER_LICENCE_COUNTRY_PRESETS: DriverLicenceCountryPreset[] = [
  {
    id: "au",
    label: "Australia",
    classes: [
      { value: "C", label: "C — Car" },
      { value: "LR", label: "LR — Light Rigid" },
      { value: "MR", label: "MR — Medium Rigid" },
      { value: "HR", label: "HR — Heavy Rigid" },
      { value: "HC", label: "HC — Heavy Combination" },
      { value: "MC", label: "MC — Multi Combination" },
      { value: "R", label: "R — Motorcycle" },
      { value: "RE", label: "RE — Motorcycle (restricted)" }
    ],
    jurisdictions: [
      { value: "NSW", label: "NSW — New South Wales" },
      { value: "VIC", label: "VIC — Victoria" },
      { value: "QLD", label: "QLD — Queensland" },
      { value: "SA", label: "SA — South Australia" },
      { value: "WA", label: "WA — Western Australia" },
      { value: "TAS", label: "TAS — Tasmania" },
      { value: "ACT", label: "ACT — Australian Capital Territory" },
      { value: "NT", label: "NT — Northern Territory" }
    ]
  },
  {
    id: "nz",
    label: "New Zealand",
    classes: [
      { value: "1", label: "1 — Car" },
      { value: "2", label: "2 — Medium rigid" },
      { value: "3", label: "3 — Medium combination" },
      { value: "4", label: "4 — Heavy rigid" },
      { value: "5", label: "5 — Heavy combination" },
      { value: "6", label: "6 — Motorcycle" }
    ],
    jurisdictions: [
      { value: "AUK", label: "Auckland" },
      { value: "BOP", label: "Bay of Plenty" },
      { value: "CAN", label: "Canterbury" },
      { value: "GIS", label: "Gisborne" },
      { value: "HKB", label: "Hawke's Bay" },
      { value: "MWT", label: "Manawatū-Whanganui" },
      { value: "MBH", label: "Marlborough" },
      { value: "NSN", label: "Nelson" },
      { value: "NTL", label: "Northland" },
      { value: "OTA", label: "Otago" },
      { value: "STL", label: "Southland" },
      { value: "TKI", label: "Taranaki" },
      { value: "TAS", label: "Tasman" },
      { value: "WKO", label: "Waikato" },
      { value: "WGN", label: "Wellington" },
      { value: "WTC", label: "West Coast" }
    ]
  },
  {
    id: "uk",
    label: "United Kingdom",
    classes: [
      { value: "B", label: "B — Car" },
      { value: "BE", label: "BE — Car + trailer" },
      { value: "C1", label: "C1 — Medium goods" },
      { value: "C", label: "C — Large goods" },
      { value: "C1E", label: "C1E — Medium goods + trailer" },
      { value: "CE", label: "CE — Large goods + trailer" },
      { value: "D1", label: "D1 — Minibus" },
      { value: "D", label: "D — Bus" },
      { value: "A", label: "A — Motorcycle" }
    ],
    jurisdictions: [
      { value: "ENG", label: "England" },
      { value: "SCT", label: "Scotland" },
      { value: "WLS", label: "Wales" },
      { value: "NIR", label: "Northern Ireland" }
    ]
  },
  {
    id: "us",
    label: "United States",
    classes: [
      { value: "A", label: "A — Combination (CDL)" },
      { value: "B", label: "B — Heavy straight (CDL)" },
      { value: "C", label: "C — Small vehicle (CDL)" },
      { value: "D", label: "D — Passenger car" },
      { value: "M", label: "M — Motorcycle" }
    ],
    jurisdictions: [
      { value: "AL", label: "AL — Alabama" },
      { value: "AK", label: "AK — Alaska" },
      { value: "AZ", label: "AZ — Arizona" },
      { value: "AR", label: "AR — Arkansas" },
      { value: "CA", label: "CA — California" },
      { value: "CO", label: "CO — Colorado" },
      { value: "CT", label: "CT — Connecticut" },
      { value: "DE", label: "DE — Delaware" },
      { value: "DC", label: "DC — District of Columbia" },
      { value: "FL", label: "FL — Florida" },
      { value: "GA", label: "GA — Georgia" },
      { value: "HI", label: "HI — Hawaii" },
      { value: "ID", label: "ID — Idaho" },
      { value: "IL", label: "IL — Illinois" },
      { value: "IN", label: "IN — Indiana" },
      { value: "IA", label: "IA — Iowa" },
      { value: "KS", label: "KS — Kansas" },
      { value: "KY", label: "KY — Kentucky" },
      { value: "LA", label: "LA — Louisiana" },
      { value: "ME", label: "ME — Maine" },
      { value: "MD", label: "MD — Maryland" },
      { value: "MA", label: "MA — Massachusetts" },
      { value: "MI", label: "MI — Michigan" },
      { value: "MN", label: "MN — Minnesota" },
      { value: "MS", label: "MS — Mississippi" },
      { value: "MO", label: "MO — Missouri" },
      { value: "MT", label: "MT — Montana" },
      { value: "NE", label: "NE — Nebraska" },
      { value: "NV", label: "NV — Nevada" },
      { value: "NH", label: "NH — New Hampshire" },
      { value: "NJ", label: "NJ — New Jersey" },
      { value: "NM", label: "NM — New Mexico" },
      { value: "NY", label: "NY — New York" },
      { value: "NC", label: "NC — North Carolina" },
      { value: "ND", label: "ND — North Dakota" },
      { value: "OH", label: "OH — Ohio" },
      { value: "OK", label: "OK — Oklahoma" },
      { value: "OR", label: "OR — Oregon" },
      { value: "PA", label: "PA — Pennsylvania" },
      { value: "RI", label: "RI — Rhode Island" },
      { value: "SC", label: "SC — South Carolina" },
      { value: "SD", label: "SD — South Dakota" },
      { value: "TN", label: "TN — Tennessee" },
      { value: "TX", label: "TX — Texas" },
      { value: "UT", label: "UT — Utah" },
      { value: "VT", label: "VT — Vermont" },
      { value: "VA", label: "VA — Virginia" },
      { value: "WA", label: "WA — Washington" },
      { value: "WV", label: "WV — West Virginia" },
      { value: "WI", label: "WI — Wisconsin" },
      { value: "WY", label: "WY — Wyoming" }
    ]
  }
];

export const DEFAULT_DRIVER_LICENCE_COUNTRY = "au";

export const DRIVER_LICENCE_COUNTRY_IDS = DRIVER_LICENCE_COUNTRY_PRESETS.map(
  (preset) => preset.id
) as readonly string[];

export function normalizeDriverLicenceCountry(value: unknown): string {
  if (typeof value === "string" && DRIVER_LICENCE_COUNTRY_IDS.includes(value)) {
    return value;
  }
  return DEFAULT_DRIVER_LICENCE_COUNTRY;
}

export function driverLicenceCountryLabel(countryId: string): string {
  return (
    DRIVER_LICENCE_COUNTRY_PRESETS.find((preset) => preset.id === countryId)?.label ??
    DRIVER_LICENCE_COUNTRY_PRESETS.find((preset) => preset.id === DEFAULT_DRIVER_LICENCE_COUNTRY)!
      .label
  );
}

function presetForCountry(countryId: string): DriverLicenceCountryPreset {
  return (
    DRIVER_LICENCE_COUNTRY_PRESETS.find((item) => item.id === countryId) ??
    DRIVER_LICENCE_COUNTRY_PRESETS.find((item) => item.id === DEFAULT_DRIVER_LICENCE_COUNTRY)!
  );
}

export function licenceClassesForCountry(countryId: string): DriverLicenceClassOption[] {
  return presetForCountry(countryId).classes;
}

export function licenceJurisdictionsForCountry(
  countryId: string
): DriverLicenceJurisdictionOption[] {
  return presetForCountry(countryId).jurisdictions;
}

/** Parse stored free-text / joined class codes into multi-select values. */
export function parseLicenceClasses(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(/[,/;|]+|\s+/)) {
    const code = part.trim().toUpperCase();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    result.push(code);
  }
  return result;
}

export function formatLicenceClasses(classes: string[]): string | null {
  const cleaned = classes.map((c) => c.trim()).filter(Boolean);
  return cleaned.length ? cleaned.join(", ") : null;
}
