/** Country presets that supply driver licence class options for the operator. */

export type DriverLicenceClassOption = {
  value: string;
  label: string;
};

export type DriverLicenceCountryPreset = {
  id: string;
  label: string;
  classes: DriverLicenceClassOption[];
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

export function licenceClassesForCountry(countryId: string): DriverLicenceClassOption[] {
  const preset =
    DRIVER_LICENCE_COUNTRY_PRESETS.find((item) => item.id === countryId) ??
    DRIVER_LICENCE_COUNTRY_PRESETS.find((item) => item.id === DEFAULT_DRIVER_LICENCE_COUNTRY)!;
  return preset.classes;
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
