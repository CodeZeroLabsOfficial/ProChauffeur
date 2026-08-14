import { NextResponse } from "next/server";

import { getAdminSessionUser } from "@/lib/firebase/session";
import { listLocationRegionSummaries } from "@/lib/seed/location/load-location-seed";

export async function GET() {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const regions = await listLocationRegionSummaries();
    return NextResponse.json({ regions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load location regions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
