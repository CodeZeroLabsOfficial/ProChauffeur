import "server-only";

import { adminDatabase } from "@/lib/firebase/admin";
import { requireBranchId } from "@/lib/branch/require-branch-id";
import { rtdbLiveTripPath } from "@/lib/models";

/** Removes the RTDB live position node for a trip. */
export async function removeLiveTripLocation(
  tripId: string,
  branchId: string
): Promise<void> {
  const path = rtdbLiveTripPath(requireBranchId(branchId), tripId);
  await adminDatabase().ref(path).remove();
}
