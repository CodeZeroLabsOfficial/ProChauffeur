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

/** Harmonized EU driving licence categories (shared across member-country presets). */
const EU_LICENCE_CLASSES: DriverLicenceClassOption[] = [
  { value: "AM", label: "AM — Moped" },
  { value: "A1", label: "A1 — Light motorcycle" },
  { value: "A2", label: "A2 — Medium motorcycle" },
  { value: "A", label: "A — Motorcycle" },
  { value: "B", label: "B — Car" },
  { value: "BE", label: "BE — Car + trailer" },
  { value: "C1", label: "C1 — Medium goods" },
  { value: "C", label: "C — Large goods" },
  { value: "C1E", label: "C1E — Medium goods + trailer" },
  { value: "CE", label: "CE — Large goods + trailer" },
  { value: "D1", label: "D1 — Minibus" },
  { value: "D", label: "D — Bus" }
];

const EU_COUNTRY_LICENCE_PRESETS: DriverLicenceCountryPreset[] = [
  { id: "at", label: "Austria" },
  { id: "be", label: "Belgium" },
  { id: "bg", label: "Bulgaria" },
  { id: "hr", label: "Croatia" },
  { id: "cy", label: "Cyprus" },
  { id: "cz", label: "Czechia" },
  { id: "dk", label: "Denmark" },
  { id: "ee", label: "Estonia" },
  { id: "fi", label: "Finland" },
  { id: "fr", label: "France" },
  { id: "de", label: "Germany" },
  { id: "gr", label: "Greece" },
  { id: "hu", label: "Hungary" },
  { id: "ie", label: "Ireland" },
  { id: "it", label: "Italy" },
  { id: "lv", label: "Latvia" },
  { id: "lt", label: "Lithuania" },
  { id: "lu", label: "Luxembourg" },
  { id: "mt", label: "Malta" },
  { id: "nl", label: "Netherlands" },
  { id: "pl", label: "Poland" },
  { id: "pt", label: "Portugal" },
  { id: "ro", label: "Romania" },
  { id: "sk", label: "Slovakia" },
  { id: "si", label: "Slovenia" },
  { id: "es", label: "Spain" },
  { id: "se", label: "Sweden" }
].map((row) => ({
  id: row.id,
  label: row.label,
  classes: EU_LICENCE_CLASSES,
  jurisdictions: []
}));

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
  ...EU_COUNTRY_LICENCE_PRESETS,
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

export const OPERATOR_JURISDICTION_IDS = DRIVER_LICENCE_COUNTRY_PRESETS.map(
  (preset) => preset.id
) as readonly string[];

function presetForJurisdiction(jurisdictionId: string): DriverLicenceCountryPreset | undefined {
  return DRIVER_LICENCE_COUNTRY_PRESETS.find((item) => item.id === jurisdictionId);
}

export function licenceClassesForCountry(countryId: string): DriverLicenceClassOption[] {
  return presetForJurisdiction(countryId)?.classes ?? [];
}

export function licenceJurisdictionsForCountry(
  countryId: string
): DriverLicenceJurisdictionOption[] {
  return presetForJurisdiction(countryId)?.jurisdictions ?? [];
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
