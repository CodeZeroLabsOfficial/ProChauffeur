import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { DEFAULT_BRANCH_ID, type VehicleClass } from "@/lib/models";
import { validateVehicleClass } from "@/lib/pricing/validate";

function vehicleClassesCollection(branchId: string) {
  return adminFirestore().collection("branches").doc(branchId).collection("vehicle_classes");
}

/**
 * PUT: create or update a vehicle class via the Admin SDK.
 */
export async function PUT(request: Request) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const payload = body as VehicleClass & { branchId?: string };
    const branchId =
      typeof payload.branchId === "string" && payload.branchId.trim()
        ? payload.branchId.trim()
        : DEFAULT_BRANCH_ID;
    const { branchId: _branchId, ...vehicleClass } = payload;
    validateVehicleClass(vehicleClass);

    const col = vehicleClassesCollection(branchId);
    const slugSnap = await col.where("slug", "==", vehicleClass.slug).get();
    const slugConflict = slugSnap.docs.find((docSnap) => docSnap.id !== vehicleClass.id);
    if (slugConflict) {
      return NextResponse.json(
        { error: `Slug "${vehicleClass.slug}" is already used by another vehicle class.` },
        { status: 409 }
      );
    }

    const ref = col.doc(vehicleClass.id);
    const existing = await ref.get();
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...data } = vehicleClass;

    await ref.set(
      {
        ...data,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() })
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save vehicle class.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
