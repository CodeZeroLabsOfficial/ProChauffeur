import { NextResponse } from "next/server";

import { requireLocationAccess } from "@/lib/auth/require-staff";
import { removeLiveTripLocation } from "@/lib/firebase/admin-live-location";
import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { parseBranchId } from "@/lib/branch/require-branch-id";
import { TRIP_STATUSES, type TripStatus } from "@/lib/models";
import { tripStatusUpdateFields } from "@/lib/trip-status-update";

function isTripStatus(value: unknown): value is TripStatus {
  return typeof value === "string" && (TRIP_STATUSES as readonly string[]).includes(value);
}

async function resolveTripRef(id: string, branchId: string) {
  const nested = adminFirestore().collection("branches").doc(branchId).collection("trips").doc(id);
  const nestedSnap = await nested.get();
  if (nestedSnap.exists) return { ref: nested, snap: nestedSnap };
  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Trip id is required." }, { status: 400 });
  }

  let status: unknown;
  let branchId: string | null = null;
  try {
    const body = await request.json();
    status = body.status;
    branchId = parseBranchId(body.branchId);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!branchId) {
    return NextResponse.json({ error: "branchId is required." }, { status: 400 });
  }
  const locationDenied = requireLocationAccess(session, branchId);
  if (locationDenied) return locationDenied;

  if (!isTripStatus(status)) {
    return NextResponse.json({ error: "Invalid trip status." }, { status: 400 });
  }

  const resolved = await resolveTripRef(id, branchId);
  if (!resolved) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  await resolved.ref.update(tripStatusUpdateFields(status, resolved.snap.data()));

  if (status === "completed" || status === "cancelled") {
    try {
      await removeLiveTripLocation(id, branchId);
    } catch {
      return NextResponse.json(
        { error: "Trip updated but live location could not be cleared." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
