import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { Collections, type VehicleClass } from "@/lib/models";
import { validateVehicleClass } from "@/lib/pricing/validate";

/**
 * PUT: create or update a vehicle class via the Admin SDK.
 *
 * Admin portal writes use the session cookie; routing through this handler avoids
 * depending on client Firestore rules for `vehicle_classes` writes.
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
    const vehicleClass = body as VehicleClass;
    validateVehicleClass(vehicleClass);

    const slugSnap = await adminFirestore()
      .collection(Collections.vehicleClasses)
      .where("slug", "==", vehicleClass.slug)
      .get();
    const slugConflict = slugSnap.docs.find((docSnap) => docSnap.id !== vehicleClass.id);
    if (slugConflict) {
      return NextResponse.json(
        { error: `Slug "${vehicleClass.slug}" is already used by another vehicle class.` },
        { status: 409 }
      );
    }

    const ref = adminFirestore().collection(Collections.vehicleClasses).doc(vehicleClass.id);
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
