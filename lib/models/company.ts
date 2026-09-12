/** `app_settings/company` document — legal entity details for the chauffeur business. */
export interface CompanyProfile {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  /** Primary business / tax registration id for the company country. */
  taxId?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
}

export const emptyCompanyProfile: CompanyProfile = {
  name: null,
  phone: null,
  email: null,
  website: null,
  taxId: null,
  street: null,
  city: null,
  state: null,
  postcode: null,
  country: null
};

/**
 * Geographic Europe (excl. UK) — ISO-2 codes and common English names.
 * UK uses BRN (Companies House), not VAT.
 */
const GEOGRAPHIC_EUROPE_TAX_ALIASES = new Set([
  // EU 27
  "at",
  "austria",
  "be",
  "belgium",
  "bg",
  "bulgaria",
  "hr",
  "croatia",
  "cy",
  "cyprus",
  "cz",
  "czechia",
  "czech republic",
  "dk",
  "denmark",
  "ee",
  "estonia",
  "fi",
  "finland",
  "fr",
  "france",
  "de",
  "germany",
  "gr",
  "greece",
  "hellenic republic",
  "hu",
  "hungary",
  "ie",
  "ireland",
  "republic of ireland",
  "it",
  "italy",
  "lv",
  "latvia",
  "lt",
  "lithuania",
  "lu",
  "luxembourg",
  "mt",
  "malta",
  "nl",
  "netherlands",
  "the netherlands",
  "holland",
  "pl",
  "poland",
  "pt",
  "portugal",
  "ro",
  "romania",
  "sk",
  "slovakia",
  "si",
  "slovenia",
  "es",
  "spain",
  "se",
  "sweden",
  // EEA extras
  "is",
  "iceland",
  "li",
  "liechtenstein",
  "no",
  "norway",
  // Other geographic Europe (excl. UK)
  "al",
  "albania",
  "ad",
  "andorra",
  "ba",
  "bosnia and herzegovina",
  "bosnia",
  "by",
  "belarus",
  "ch",
  "switzerland",
  "fo",
  "faroe islands",
  "gi",
  "gibraltar",
  "gg",
  "guernsey",
  "im",
  "isle of man",
  "je",
  "jersey",
  "xk",
  "kosovo",
  "md",
  "moldova",
  "republic of moldova",
  "mc",
  "monaco",
  "me",
  "montenegro",
  "mk",
  "north macedonia",
  "macedonia",
  "ru",
  "russia",
  "russian federation",
  "sm",
  "san marino",
  "rs",
  "serbia",
  "ua",
  "ukraine",
  "va",
  "vatican",
  "vatican city",
  "holy see"
]);

/** UI label for the primary business registration / tax id, by country. */
export function taxIdLabelForCountry(country: string | null | undefined): string {
  const raw = country?.trim().toLowerCase() ?? "";
  if (raw === "au" || raw === "australia" || raw === "aus") return "ABN";
  if (raw === "us" || raw === "usa" || raw === "united states" || raw === "united states of america") {
    return "EIN";
  }
  if (raw === "nz" || raw === "new zealand") return "NZBN";
  if (GEOGRAPHIC_EUROPE_TAX_ALIASES.has(raw)) return "VAT";
  return "BRN";
}
