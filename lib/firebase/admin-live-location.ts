import "server-only";

import { adminDatabase } from "@/lib/firebase/admin";
import { DEFAULT_BRANCH_ID, rtdbBranchLiveLocationsPath } from "@/lib/models";

/** Removes `tripId` from a driver's RTDB live-location node (keeps lat/lng). */
export async function clearLiveLocationTripId(
  driverId: string,
  branchId: string = DEFAULT_BRANCH_ID
): Promise<void> {
  const nestedPath = `${rtdbBranchLiveLocationsPath(branchId)}/${driverId}`;
  const nestedRef = adminDatabase().ref(nestedPath);
  const nestedSnap = await nestedRef.get();
  if (!nestedSnap.exists()) return;
  await nestedRef.update({ tripId: null });
}
