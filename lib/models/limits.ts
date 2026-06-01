/** AppGlobalLimits.swift — `app_settings/limits` document. */
export interface AppGlobalLimits {
  maxAdmins: number;
  maxDrivers: number;
  maxLocations: number;
  subscriptionTier: string;
}

/** Sentinel used when the document or fields are absent (caps decay to "unlimited"). */
export const UNLIMITED = Number.MAX_SAFE_INTEGER;

export const unlimitedLimits: AppGlobalLimits = {
  maxAdmins: UNLIMITED,
  maxDrivers: UNLIMITED,
  maxLocations: UNLIMITED,
  subscriptionTier: ""
};

export function capLabel(value: number): string {
  return value >= UNLIMITED ? "Unlimited" : String(value);
}
