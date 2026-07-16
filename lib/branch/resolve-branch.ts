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

export type ResolveBranchInput = {
  postcode: string;
  branches: Branch[];
  limits: Pick<AppGlobalLimits, "maxLocations">;
  defaultBranchId?: string;
};

/**
 * Resolves a customer pickup postcode to a Location (branch) id.
 *
 * - When `maxLocations ≤ 1`, returns `defaultBranchId` (no postcode matching).
 * - When multi-Location is on, matches active branches with `serviceArea.type === "postcodes"`.
 * - Zero matches → throws ``BranchResolveError``.
 * - Multiple matches → first by name (postcode lists should not overlap).
 */
export function resolveBranchId(input: ResolveBranchInput): string {
  const defaultBranchId = input.defaultBranchId ?? DEFAULT_BRANCH_ID;

  if (!isMultiLocationEnabled(input.limits.maxLocations)) {
    return defaultBranchId;
  }

  const postcode = normalizePostcode(input.postcode);
  if (!postcode) {
    throw new BranchResolveError("Enter a pickup postcode to continue.");
  }

  const active = input.branches
    .filter((b) => b.isActive)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const matches = active.filter((b) => branchMatchesPostcode(b, postcode));
  if (matches.length === 0) {
    throw new BranchResolveError();
  }
  return matches[0]!.id;
}
