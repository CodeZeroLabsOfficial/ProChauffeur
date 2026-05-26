import type { CompanyProfile } from "@/lib/prochauffeur/types";

export function displayValue(value: string, fallback = "—"): string {
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function trimmedCompanyProfile(profile: CompanyProfile): CompanyProfile {
  return {
    displayName: profile.displayName.trim(),
    address: profile.address.trim(),
    phone: profile.phone.trim(),
    email: profile.email.trim(),
    website: profile.website.trim(),
    abn: profile.abn.trim(),
    acn: profile.acn.trim(),
    logoURL: profile.logoURL.trim(),
  };
}
