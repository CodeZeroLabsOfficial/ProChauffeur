import "server-only";

import { adminDatabase } from "@/lib/firebase/admin";
import { rtdbLiveLocationsPath } from "@/lib/models";

/** Removes `tripId` from a driver's RTDB live-location node (keeps lat/lng). */
export async function clearLiveLocationTripId(driverId: string): Promise<void> {
  const ref = adminDatabase().ref(`${rtdbLiveLocationsPath}/${driverId}`);
  const snap = await ref.get();
  if (!snap.exists()) return;
  await ref.update({ tripId: null });
}
