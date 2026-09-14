import "server-only";

import { adminAuth } from "@/lib/firebase/admin";
import type { StaffRole } from "@/lib/models";

/** Auth claims RTDB trip chat rules read for Location staff. */
export type StaffAuthClaimsInput = {
  staffRole: StaffRole;
  canAccessAllBranches: boolean;
  branchIds: string[] | null;
};

export function staffAuthClaims(input: StaffAuthClaimsInput): Record<string, unknown> {
  const claims: Record<string, unknown> = {
    role: "admin",
    staffRole: input.staffRole,
    canAccessAllBranches: input.canAccessAllBranches
  };
  if (!input.canAccessAllBranches) {
    const branches: Record<string, boolean> = {};
    for (const id of input.branchIds ?? []) {
      const key = id.trim();
      if (key) branches[key] = true;
    }
    claims.branches = branches;
  }
  return claims;
}

export async function syncStaffAuthClaims(uid: string, input: StaffAuthClaimsInput): Promise<void> {
  await adminAuth().setCustomUserClaims(uid, staffAuthClaims(input));
}
