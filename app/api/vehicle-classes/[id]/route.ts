import { NextResponse } from "next/server";

import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { DEFAULT_BRANCH_ID } from "@/lib/models";

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

  let branchId = DEFAULT_BRANCH_ID;
  try {
    const body = (await request.json()) as { branchId?: string };
    if (typeof body.branchId === "string" && body.branchId.trim()) {
      branchId = body.branchId.trim();
    }
  } catch {
    const url = new URL(request.url);
    const q = url.searchParams.get("branchId");
    if (q?.trim()) branchId = q.trim();
  }

  const branchRef = adminFirestore().collection("branches").doc(branchId);
  const inUseSnap = await branchRef
    .collection("vehicles")
    .where("vehicleClassId", "==", id)
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
