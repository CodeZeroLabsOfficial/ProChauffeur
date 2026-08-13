import { NextResponse } from "next/server";

import { requireLocationAccess } from "@/lib/auth/require-staff";
import { canUsePath } from "@/lib/auth/staff-access";
import { parseBranchId } from "@/lib/branch/require-branch-id";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { createActivityNotificationAdmin } from "@/lib/firebase/admin-notifications";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { driverNotification } from "@/lib/notifications/messages";

type RouteContext = { params: Promise<{ uid: string }> };

/**
 * DELETE: remove a chauffeur's Auth account, user document, and home roster.
 * Linked fleet vehicles are unassigned, not deleted.
 */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!canUsePath(session.staffRole, "/dashboard/drivers")) {
    return NextResponse.json(
      { error: "You do not have permission to manage chauffeurs." },
      { status: 403 }
    );
  }

  const { uid } = await context.params;
  if (!uid) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  let branchId: string | null = null;
  let driverTitle: string | undefined;
  try {
    const body = (await request.json()) as { branchId?: string; driverTitle?: string };
    branchId = parseBranchId(body.branchId);
    driverTitle = typeof body.driverTitle === "string" ? body.driverTitle : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }
  const locationDenied = requireLocationAccess(session, branchId);
  if (locationDenied) return locationDenied;

  const userRef = adminFirestore().collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Chauffeur not found." }, { status: 404 });
  }
  const data = snap.data() ?? {};
  if (data.role !== "driver") {
    return NextResponse.json({ error: "This user is not a chauffeur." }, { status: 400 });
  }
  const homeBranchId = typeof data.homeBranchId === "string" ? data.homeBranchId : null;
  if (homeBranchId && homeBranchId !== branchId) {
    return NextResponse.json(
      { error: "This chauffeur is assigned to another Location." },
      { status: 400 }
    );
  }

  const title =
    driverTitle?.trim() ||
    (typeof data.profile?.displayName === "string" && data.profile.displayName.trim()) ||
    (typeof data.email === "string" && data.email.trim()) ||
    "Chauffeur";

  try {
    const branchRef = adminFirestore().collection("branches").doc(branchId);
    const vehiclesCol = branchRef.collection("vehicles");
    const assignedSnap = await vehiclesCol.where("assignedChauffeurUserId", "==", uid).get();
    if (!assignedSnap.empty) {
      const batch = adminFirestore().batch();
      for (const vehicleDoc of assignedSnap.docs) {
        batch.update(vehicleDoc.ref, { assignedChauffeurUserId: "" });
      }
      await batch.commit();
    }
    await branchRef.collection("drivers").doc(uid).delete().catch(() => undefined);
    await userRef.delete();

    try {
      await adminAuth().deleteUser(uid);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "auth/user-not-found") {
        throw err;
      }
    }

    await createActivityNotificationAdmin(driverNotification("deleted", title, uid), session);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not delete the chauffeur." }, { status: 500 });
  }
}
