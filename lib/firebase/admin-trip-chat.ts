import "server-only";

import { adminDatabase } from "@/lib/firebase/admin";
import { requireBranchId } from "@/lib/branch/require-branch-id";
import { rtdbBranchTripChatsPath, rtdbTripChatPath } from "@/lib/models";

/** Removes the RTDB trip chat node. */
export async function removeTripChat(tripId: string, branchId: string): Promise<void> {
  const path = rtdbTripChatPath(requireBranchId(branchId), tripId);
  await adminDatabase().ref(path).remove();
}

/** Removes every trip chat under a Location. */
export async function removeBranchTripChats(branchId: string): Promise<void> {
  const path = rtdbBranchTripChatsPath(requireBranchId(branchId));
  await adminDatabase().ref(path).remove();
}
