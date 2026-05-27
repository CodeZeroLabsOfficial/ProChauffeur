import type { CompanyProfile } from "@/lib/prochauffeur/types";

export function displayValue(value: string, fallback = "—"): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function trimmedCompanyProfile(profile: CompanyProfile): CompanyProfile {
  return {
    displayName: profile.displayName.trim(),
    address: {
      street: profile.address.street.trim(),
      city: profile.address.city.trim(),
      state: profile.address.state.trim(),
      postcode: profile.address.postcode.trim(),
      country: profile.address.country.trim(),
    },
    phone: profile.phone.trim(),
    email: profile.email.trim(),
    website: profile.website.trim(),
    abn: profile.abn.trim(),
    acn: profile.acn.trim(),
    logoURL: profile.logoURL.trim(),
  };
}
