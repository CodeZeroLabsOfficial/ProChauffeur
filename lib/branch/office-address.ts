import type { AddressSuggestion } from "@/lib/mapbox/geocoding";
import type { Branch } from "@/lib/models/branch";
import { hasValidCoordinate } from "@/lib/mapbox/coordinates";

export function officeSuggestionFromBranch(branch: Branch | null | undefined): AddressSuggestion | null {
  if (!branch?.officeAddressLine?.trim()) return null;
  const latitude = branch.officeLatitude;
  const longitude = branch.officeLongitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!hasValidCoordinate({ latitude, longitude })) return null;

  return {
    id: `${branch.id}-office`,
    addressLine: branch.officeAddressLine,
    coordinate: { latitude, longitude }
  };
}
