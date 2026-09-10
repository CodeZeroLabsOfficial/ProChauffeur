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

/** UI label for the primary business registration / tax id, by country. */
export function taxIdLabelForCountry(country: string | null | undefined): string {
  const raw = country?.trim().toLowerCase() ?? "";
  if (raw === "au" || raw === "australia" || raw === "aus") return "ABN";
  if (raw === "us" || raw === "usa" || raw === "united states" || raw === "united states of america") {
    return "EIN";
  }
  if (
    raw === "gb" ||
    raw === "uk" ||
    raw === "united kingdom" ||
    raw === "great britain" ||
    raw === "england"
  ) {
    return "Company number";
  }
  if (raw === "nz" || raw === "new zealand") return "NZBN";
  if (raw === "ca" || raw === "canada") return "Business number";
  return "Business registration number";
}
