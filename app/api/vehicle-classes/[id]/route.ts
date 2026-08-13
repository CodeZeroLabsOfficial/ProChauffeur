import { NextResponse } from "next/server";

import { requireLocationAccess } from "@/lib/auth/require-staff";
import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { parseBranchId } from "@/lib/branch/require-branch-id";

/**
 * DELETE: remove a vehicle class when it is not assigned to fleet vehicles.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Vehicle class id is required." }, { status: 400 });
  }

  let branchId: string | null = null;
  try {
    const body = (await request.json()) as { branchId?: string };
    branchId = parseBranchId(body.branchId);
  } catch {
    branchId = parseBranchId(new URL(request.url).searchParams.get("branchId"));
  }

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }
  const locationDenied = requireLocationAccess(session, branchId);
  if (locationDenied) return locationDenied;

  const branchRef = adminFirestore().collection("branches").doc(branchId);
  const inUseSnap = await branchRef
    .collection("vehicles")
    .where("details.vehicleClassId", "==", id)
    .limit(1)
    .get();
  if (!inUseSnap.empty) {
    return NextResponse.json(
      { error: "Cannot delete a vehicle class that is assigned to fleet vehicles." },
      { status: 409 }
    );
  }

  const ref = branchRef.collection("vehicle_classes").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Vehicle class not found." }, { status: 404 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}
