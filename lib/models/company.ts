/** Registered business address for invoices and correspondence. */
export interface CompanyAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
}

/** `app_settings/company` document — legal entity details for the chauffeur business. */
export interface CompanyProfile {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  abn?: string | null;
  acn?: string | null;
  address?: CompanyAddress | null;
}

export const emptyCompanyProfile: CompanyProfile = {
  name: null,
  phone: null,
  email: null,
  website: null,
  abn: null,
  acn: null,
  address: null
};
