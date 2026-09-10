import { NextResponse } from "next/server";

import { getAdminSessionUser } from "@/lib/firebase/session";
import { isOnboardingCompleted } from "@/lib/onboarding/server";

/** GET: whether the stamp has ≥1 admin (ready for portal). */
export async function GET() {
  const completed = await isOnboardingCompleted();
  const session = await getAdminSessionUser();
  return NextResponse.json({
    completed,
    authenticated: Boolean(session),
    mapboxConfigured: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim())
  });
}
