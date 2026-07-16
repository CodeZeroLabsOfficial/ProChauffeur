import { NextResponse } from "next/server";

import { clearLiveLocationTripId } from "@/lib/firebase/admin-live-location";
import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { DEFAULT_BRANCH_ID, TRIP_STATUSES, type TripStatus } from "@/lib/models";
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
  let branchId: string = DEFAULT_BRANCH_ID;
  try {
    const body = await request.json();
    status = body.status;
    if (typeof body.branchId === "string" && body.branchId.trim()) {
      branchId = body.branchId.trim();
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isTripStatus(status)) {
    return NextResponse.json({ error: "Invalid trip status." }, { status: 400 });
  }

  const resolved = await resolveTripRef(id, branchId);
  if (!resolved) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  const driverID = (resolved.snap.data()?.driverID as string | null | undefined) ?? null;

  await resolved.ref.update(tripStatusUpdateFields(status, resolved.snap.data()));

  if ((status === "completed" || status === "cancelled") && driverID) {
    try {
      await clearLiveLocationTripId(driverID, branchId);
    } catch {
      return NextResponse.json(
        { error: "Trip updated but live location could not be cleared." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
