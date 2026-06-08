import { NextResponse } from "next/server";

import { clearLiveLocationTripId } from "@/lib/firebase/admin-live-location";
import { adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { Collections, TRIP_STATUSES, type TripStatus } from "@/lib/models";
import { tripStatusUpdateFields } from "@/lib/trip-status-update";

function isTripStatus(value: unknown): value is TripStatus {
  return typeof value === "string" && (TRIP_STATUSES as readonly string[]).includes(value);
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
  try {
    ({ status } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isTripStatus(status)) {
    return NextResponse.json({ error: "Invalid trip status." }, { status: 400 });
  }

  const tripRef = adminFirestore().collection(Collections.trips).doc(id);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  }

  const driverID = (tripSnap.data()?.driverID as string | null | undefined) ?? null;

  await tripRef.update(tripStatusUpdateFields(status, tripSnap.data()));

  if ((status === "completed" || status === "cancelled") && driverID) {
    try {
      await clearLiveLocationTripId(driverID);
    } catch {
      return NextResponse.json(
        { error: "Trip updated but live location could not be cleared." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
