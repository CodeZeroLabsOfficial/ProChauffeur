import { NextResponse } from "next/server";

import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { Collections } from "@/lib/models";

/**
 * DELETE: remove a vehicle class when it is not assigned to fleet vehicles.
 */
export async function DELETE(
  _request: Request,
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

  const inUseSnap = await adminFirestore()
    .collection(Collections.vehicles)
    .where("vehicleClassId", "==", id)
    .limit(1)
    .get();
  if (!inUseSnap.empty) {
    return NextResponse.json(
      { error: "Cannot delete a vehicle class that is assigned to fleet vehicles." },
      { status: 409 }
    );
  }

  const ref = adminFirestore().collection(Collections.vehicleClasses).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Vehicle class not found." }, { status: 404 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}
