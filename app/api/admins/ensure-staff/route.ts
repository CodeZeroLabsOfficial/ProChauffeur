import { NextResponse } from "next/server";

import { requireStaffAdmin } from "@/lib/auth/require-staff";
import { parseStaffRole } from "@/lib/auth/staff-access";
import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";

/**
 * POST: write staffRole + All Locations on existing admin users that are missing them.
 */
export async function POST() {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const denied = requireStaffAdmin(session);
  if (denied) return denied;

  const snap = await adminFirestore().collection("users").where("role", "==", "admin").get();
  const writes = snap.docs.filter((doc) => !parseStaffRole(doc.data().staffRole));
  if (writes.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const batch = adminFirestore().batch();
  for (const doc of writes) {
    batch.update(doc.ref, {
      staffRole: "admin",
      canAccessAllBranches: true
    });
  }
  await batch.commit();
  return NextResponse.json({ updated: writes.length });
}
