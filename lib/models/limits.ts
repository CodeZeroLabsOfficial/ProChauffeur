/** AppGlobalLimits.swift — `app_settings/limits` document. */
export interface AppGlobalLimits {
  maxAdmins: number;
  maxDrivers: number;
  maxLocations: number;
  subscriptionTier: string;
}

/** Sentinel used when a numeric cap field is absent (admins/drivers decay to unlimited). */
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

/**
 * Default when the limits document is missing or fetch fails.
 * `maxLocations` defaults to 1 so multi-Location stays off until explicitly raised.
 */
export const unlimitedLimits: AppGlobalLimits = {
  maxAdmins: UNLIMITED,
  maxDrivers: UNLIMITED,
  maxLocations: 1,
  subscriptionTier: ""
};

/** Multi-Location UI / resolve is on when the license allows more than one Location. */
export function isMultiLocationEnabled(maxLocations: number): boolean {
  return maxLocations > 1;
}

/** Whether another Location (branch) may be created under the current cap. */
export function canCreateLocation(used: number, maxLocations: number): boolean {
  if (maxLocations >= UNLIMITED) return true;
  return used < maxLocations;
}

export function capLabel(value: number): string {
  return value >= UNLIMITED ? "Unlimited" : String(value);
}

export function usagePercent(used: number, max: number): number {
  if (max >= UNLIMITED || max <= 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}
