import { NextResponse } from "next/server";
import { z } from "zod";

import { requireCanManageLocations } from "@/lib/auth/require-staff";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { createLocationFromSeedAdmin } from "@/lib/seed/location/create-location";

const createLocationBodySchema = z.object({
  regionId: z.string().min(1),
  city: z.string().min(1),
  name: z.string().min(1),
  officeAddressLine: z.string().min(1),
  officeLatitude: z.number(),
  officeLongitude: z.number(),
  officePhone: z.string().nullable().optional(),
  officeEmail: z.string().nullable().optional(),
  contactUserId: z.string().nullable().optional(),
  isActive: z.boolean()
});

export async function POST(request: Request) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const denied = requireCanManageLocations(session);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createLocationBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter location details." }, { status: 400 });
  }

  try {
    const branch = await createLocationFromSeedAdmin(parsed.data);
    return NextResponse.json({
      branch: {
        ...branch,
        createdAt: branch.createdAt.toISOString(),
        updatedAt: branch.updatedAt.toISOString()
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create the location.";
    const status = message.includes("limit reached") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
