import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { requireLocationAccess } from "@/lib/auth/require-staff";
import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { parseBranchId } from "@/lib/branch/require-branch-id";
import {
  isValidVehicleClassSlug,
  type VehicleClass
} from "@/lib/models";
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
    const branchId = parseBranchId(payload.branchId);
    if (!branchId) {
      return NextResponse.json({ error: "branchId is required." }, { status: 400 });
    }
    const locationDenied = requireLocationAccess(session, branchId);
    if (locationDenied) return locationDenied;
    const { branchId: _branchId, ...vehicleClass } = payload;
    validateVehicleClass(vehicleClass);

    const col = vehicleClassesCollection(branchId);
    const ref = col.doc(vehicleClass.id);
    const existing = await ref.get();

    if (
      !isValidVehicleClassSlug(vehicleClass.id) ||
      vehicleClass.id !== vehicleClass.slug
    ) {
      return NextResponse.json(
        { error: "Vehicle class id must be the product slug." },
        { status: 400 }
      );
    }

    const slugSnap = await col.where("slug", "==", vehicleClass.slug).get();
    const slugConflict = slugSnap.docs.find((docSnap) => docSnap.id !== vehicleClass.id);
    if (slugConflict) {
      return NextResponse.json(
        { error: `Slug "${vehicleClass.slug}" is already used by another vehicle class.` },
        { status: 409 }
      );
    }
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
