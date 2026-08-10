export const VEHICLE_INSURANCE_COVER_TYPES = [
  "Compulsory Third Party",
  "Comprehensive",
  "Third Party Property Damage",
  "Third Party Property Damage, Fire and Theft"
] as const;

export type VehicleInsuranceCoverType = (typeof VEHICLE_INSURANCE_COVER_TYPES)[number];

/** Older camelCase values that may still exist on vehicle documents. */
const LEGACY_COVER_TYPE_BY_KEY: Record<string, VehicleInsuranceCoverType> = {
  compulsoryThirdParty: "Compulsory Third Party",
  comprehensive: "Comprehensive",
  thirdPartyPropertyDamage: "Third Party Property Damage",
  thirdPartyFireAndTheft: "Third Party Property Damage, Fire and Theft"
};

export const VEHICLE_INSURANCE_COVER_TYPE_OPTIONS = VEHICLE_INSURANCE_COVER_TYPES.map((value) => ({
  value,
  label: value
}));

export function parseVehicleInsuranceCoverType(raw: unknown): VehicleInsuranceCoverType | null {
  if (typeof raw !== "string") return null;
  if ((VEHICLE_INSURANCE_COVER_TYPES as readonly string[]).includes(raw)) {
    return raw as VehicleInsuranceCoverType;
  }
  return LEGACY_COVER_TYPE_BY_KEY[raw] ?? null;
}

export function validityProgress(
  start: Date | null | undefined,
  expiry: Date | null | undefined,
  now = new Date()
): number | null {
  if (!start || !expiry) return null;
  const startMs = start.getTime();
  const expiryMs = expiry.getTime();
  if (!(expiryMs > startMs)) return null;
  const elapsed = now.getTime() - startMs;
  const total = expiryMs - startMs;
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}
