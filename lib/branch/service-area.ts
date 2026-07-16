import type { AddressSuggestion } from "@/lib/mapbox/geocoding";
import { hasValidCoordinate } from "@/lib/mapbox/coordinates";
import type { Branch } from "@/lib/models/branch";

export type ServiceAreaEditorType = "postcodes" | "radius";

export const RADIUS_KM_MIN = 5;
export const RADIUS_KM_MAX = 100;
export const RADIUS_KM_DEFAULT = 25;

export function parsePostcodes(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);
}

export function postcodesToText(area: Branch["serviceArea"]): string {
  const list = area?.type === "postcodes" ? area.postcodes : null;
  return (list ?? []).join("\n");
}

export function editorTypeFromBranch(branch: Branch | null | undefined): ServiceAreaEditorType {
  return branch?.serviceArea?.type === "radius" ? "radius" : "postcodes";
}

export function centerSuggestionFromServiceArea(
  branch: Branch | null | undefined
): AddressSuggestion | null {
  const area = branch?.serviceArea;
  if (!area || area.type !== "radius") return null;
  const latitude = area.centerLatitude;
  const longitude = area.centerLongitude;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!hasValidCoordinate({ latitude, longitude })) return null;

  return {
    id: `${branch!.id}-service-center`,
    addressLine: area.centerAddressLine?.trim() || "Service area center",
    coordinate: { latitude, longitude }
  };
}

export function radiusKmFromServiceArea(area: Branch["serviceArea"]): number {
  if (!area || area.type !== "radius" || typeof area.radiusMeters !== "number") {
    return RADIUS_KM_DEFAULT;
  }
  const km = area.radiusMeters / 1000;
  return Math.min(RADIUS_KM_MAX, Math.max(RADIUS_KM_MIN, Math.round(km)));
}

export function isServiceAreaConfigured(area: Branch["serviceArea"]): boolean {
  if (!area) return false;
  if (area.type === "postcodes") return (area.postcodes ?? []).length > 0;
  if (area.type === "radius") {
    const lat = area.centerLatitude;
    const lng = area.centerLongitude;
    return (
      typeof lat === "number" &&
      typeof lng === "number" &&
      hasValidCoordinate({ latitude: lat, longitude: lng }) &&
      typeof area.radiusMeters === "number" &&
      area.radiusMeters > 0
    );
  }
  return false;
}

export function formatServiceAreaSummary(area: Branch["serviceArea"]): string | null {
  if (!isServiceAreaConfigured(area)) return null;
  if (area!.type === "postcodes") {
    const count = (area!.postcodes ?? []).length;
    return count > 0 ? `${count} listed` : null;
  }
  if (area!.type === "radius" && typeof area!.radiusMeters === "number") {
    const km = Math.round(area!.radiusMeters / 1000);
    return `${km} km radius`;
  }
  return null;
}

export function formatServiceAreaDetail(area: Branch["serviceArea"]): string | null {
  if (!isServiceAreaConfigured(area)) return null;
  if (area!.type === "postcodes") {
    const count = (area!.postcodes ?? []).length;
    return `${count} ${count === 1 ? "postcode" : "postcodes"} in service area`;
  }
  if (area!.type === "radius" && typeof area!.radiusMeters === "number") {
    const km = Math.round(area!.radiusMeters / 1000);
    return `${km} km radius`;
  }
  return null;
}

export function buildServiceAreaFromEditor(input: {
  type: ServiceAreaEditorType;
  postcodesText: string;
  center: AddressSuggestion | null;
  radiusKm: number;
}): Branch["serviceArea"] {
  if (input.type === "postcodes") {
    const postcodes = parsePostcodes(input.postcodesText);
    return postcodes.length > 0 ? { type: "postcodes", postcodes } : null;
  }

  if (!input.center || !hasValidCoordinate(input.center.coordinate)) return null;
  if (input.radiusKm <= 0) return null;

  return {
    type: "radius",
    centerLatitude: input.center.coordinate.latitude,
    centerLongitude: input.center.coordinate.longitude,
    centerAddressLine: input.center.addressLine,
    radiusMeters: Math.round(input.radiusKm * 1000)
  };
}
