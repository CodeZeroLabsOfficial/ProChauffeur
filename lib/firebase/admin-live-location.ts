import "server-only";

import { adminDatabase } from "@/lib/firebase/admin";
import { DEFAULT_BRANCH_ID, rtdbLiveTripPath } from "@/lib/models";

/** Removes the RTDB live position node for a trip. */
export async function removeLiveTripLocation(
  tripId: string,
  branchId: string = DEFAULT_BRANCH_ID
): Promise<void> {
  const path = rtdbLiveTripPath(branchId, tripId);
  await adminDatabase().ref(path).remove();
}
