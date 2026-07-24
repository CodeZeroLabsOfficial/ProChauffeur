import type { UserProfile } from "@/lib/models/user";

export interface PostalAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
}

/** Customer address fields snapshotted on `trips/{id}` at booking time. */
export interface CustomerAddressSnapshot {
  customerStreet?: string | null;
  customerCity?: string | null;
  customerState?: string | null;
  customerPostcode?: string | null;
  customerCountry?: string | null;
}

export function formatPostalAddress(address: PostalAddress | null | undefined): string | null {
  if (!address) return null;
  const parts = [
    address.street?.trim(),
    address.city?.trim(),
    address.state?.trim(),
    address.postcode?.trim(),
    address.country?.trim()
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Multi-line postal layout:
 * street
 * suburb, postcode, state
 * country
 */
export function formatPostalAddressLines(
  address: PostalAddress | null | undefined
): string[] {
  if (!address) return [];
  const street = address.street?.trim();
  const locality = [address.city?.trim(), address.postcode?.trim(), address.state?.trim()]
    .filter(Boolean)
    .join(", ");
  const country = address.country?.trim();
  return [street, locality || null, country].filter((line): line is string => Boolean(line));
}

export function hasPostalAddress(address: PostalAddress | null | undefined): boolean {
  if (!address) return false;
  return Boolean(
    address.street?.trim() ||
      address.city?.trim() ||
      address.state?.trim() ||
      address.postcode?.trim() ||
      address.country?.trim()
  );
}

export function isEmptyPostalAddress(address: PostalAddress | null | undefined): boolean {
  return !hasPostalAddress(address);
}

export function isCompletePostalAddress(address: PostalAddress | null | undefined): boolean {
  if (!address) return false;
  return Boolean(
    address.street?.trim() &&
      address.city?.trim() &&
      address.state?.trim() &&
      address.postcode?.trim() &&
      address.country?.trim()
  );
}

/** True when address is fully empty or all five fields are filled. */
export function isValidPostalAddress(address: PostalAddress | null | undefined): boolean {
  return isEmptyPostalAddress(address) || isCompletePostalAddress(address);
}

export function postalAddressFromProfile(profile: UserProfile): PostalAddress {
  return {
    street: profile.street ?? null,
    city: profile.city ?? null,
    state: profile.state ?? null,
    postcode: profile.postcode ?? null,
    country: profile.country ?? null
  };
}

export function customerAddressSnapshotFromProfile(
  profile: UserProfile
): CustomerAddressSnapshot {
  return {
    customerStreet: profile.street ?? null,
    customerCity: profile.city ?? null,
    customerState: profile.state ?? null,
    customerPostcode: profile.postcode ?? null,
    customerCountry: profile.country ?? null
  };
}

export function postalAddressFromTripSnapshot(
  trip: CustomerAddressSnapshot | null | undefined
): PostalAddress {
  if (!trip) return {};
  return {
    street: trip.customerStreet ?? null,
    city: trip.customerCity ?? null,
    state: trip.customerState ?? null,
    postcode: trip.customerPostcode ?? null,
    country: trip.customerCountry ?? null
  };
}

export function toProfilePostalFields(
  address: PostalAddress
): Pick<UserProfile, "street" | "city" | "state" | "postcode" | "country"> {
  return {
    street: address.street?.trim() || null,
    city: address.city?.trim() || null,
    state: address.state?.trim() || null,
    postcode: address.postcode?.trim() || null,
    country: address.country?.trim() || null
  };
}
