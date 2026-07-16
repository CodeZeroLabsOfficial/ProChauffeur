import { haversineMeters } from "@/lib/geo/haversine";
import { hasValidCoordinate } from "@/lib/mapbox/coordinates";
import {
  isMultiLocationEnabled,
  type AppGlobalLimits
} from "@/lib/models/limits";
import { DEFAULT_BRANCH_ID, type Branch } from "@/lib/models/branch";

export class BranchResolveError extends Error {
  readonly code = "out_of_area" as const;

  constructor(message = "This pickup is outside our service area.") {
    super(message);
    this.name = "BranchResolveError";
  }
}

function normalizePostcode(postcode: string): string {
  return postcode.trim().toUpperCase();
}

function branchMatchesPostcode(branch: Branch, postcode: string): boolean {
  const area = branch.serviceArea;
  if (!area || area.type !== "postcodes") return false;
  const list = area.postcodes ?? [];
  return list.some((p) => normalizePostcode(p) === postcode);
}

function branchMatchesRadius(
  branch: Branch,
  latitude: number,
  longitude: number
): boolean {
  const area = branch.serviceArea;
  if (!area || area.type !== "radius") return false;
  const centerLat = area.centerLatitude;
  const centerLng = area.centerLongitude;
  const radiusMeters = area.radiusMeters;
  if (
    typeof centerLat !== "number" ||
    typeof centerLng !== "number" ||
    typeof radiusMeters !== "number" ||
    radiusMeters <= 0
  ) {
    return false;
  }
  if (!hasValidCoordinate({ latitude: centerLat, longitude: centerLng })) return false;

  return haversineMeters(latitude, longitude, centerLat, centerLng) <= radiusMeters;
}

export type ResolveBranchInput = {
  postcode?: string;
  latitude?: number;
  longitude?: number;
  branches: Branch[];
  limits: Pick<AppGlobalLimits, "maxLocations">;
  defaultBranchId?: string;
};

function sortedActiveBranches(branches: Branch[]): Branch[] {
  return branches
    .filter((b) => b.isActive)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

function firstMatch(branches: Branch[]): string | null {
  return branches[0]?.id ?? null;
}

/**
 * Resolves a customer pickup to a Location (branch) id.
 *
 * - When `maxLocations ≤ 1`, returns `defaultBranchId` (no geo matching).
 * - When multi-Location is on, matches postcodes first, then radius circles.
 * - Zero matches → throws ``BranchResolveError``.
 * - Multiple matches in a tier → first by name.
 */
export function resolveBranchId(input: ResolveBranchInput): string {
  const defaultBranchId = input.defaultBranchId ?? DEFAULT_BRANCH_ID;

  if (!isMultiLocationEnabled(input.limits.maxLocations)) {
    return defaultBranchId;
  }

  const postcode = normalizePostcode(input.postcode ?? "");
  const hasCoords =
    typeof input.latitude === "number" &&
    typeof input.longitude === "number" &&
    hasValidCoordinate({ latitude: input.latitude, longitude: input.longitude });

  if (!postcode && !hasCoords) {
    throw new BranchResolveError("Enter a pickup address to continue.");
  }

  const active = sortedActiveBranches(input.branches);

  if (postcode) {
    const postcodeMatches = active.filter((b) => branchMatchesPostcode(b, postcode));
    const postcodeId = firstMatch(postcodeMatches);
    if (postcodeId) return postcodeId;
  }

  if (hasCoords) {
    const radiusMatches = active.filter((b) =>
      branchMatchesRadius(b, input.latitude!, input.longitude!)
    );
    const radiusId = firstMatch(radiusMatches);
    if (radiusId) return radiusId;
  }

  throw new BranchResolveError();
}
