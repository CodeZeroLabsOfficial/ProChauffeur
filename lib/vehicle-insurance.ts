export const VEHICLE_INSURANCE_POLICY_TYPES = [
  "comprehensive",
  "thirdPartyPropertyDamage",
  "thirdPartyFireAndTheft"
] as const;

export type VehicleInsurancePolicyType = (typeof VEHICLE_INSURANCE_POLICY_TYPES)[number];

export const vehicleInsurancePolicyTypeLabel: Record<VehicleInsurancePolicyType, string> = {
  comprehensive: "Comprehensive",
  thirdPartyPropertyDamage: "Third Party Property Damage",
  thirdPartyFireAndTheft: "Third Party Property Damage, Fire and Theft"
};

export const VEHICLE_INSURANCE_POLICY_TYPE_OPTIONS = VEHICLE_INSURANCE_POLICY_TYPES.map(
  (value) => ({
    value,
    label: vehicleInsurancePolicyTypeLabel[value]
  })
);

export function parseVehicleInsurancePolicyType(
  raw: unknown
): VehicleInsurancePolicyType | null {
  if (typeof raw !== "string") return null;
  return (VEHICLE_INSURANCE_POLICY_TYPES as readonly string[]).includes(raw)
    ? (raw as VehicleInsurancePolicyType)
    : null;
}
