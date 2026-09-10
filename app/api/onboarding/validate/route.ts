import { NextResponse } from "next/server";

import { isOnboardingCompleted, validateOnboardingInvite } from "@/lib/onboarding/server";

/**
 * POST: validate an onboarding invite token.
 * Body: { token: string }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const token =
    body && typeof body === "object" && typeof (body as { token?: unknown }).token === "string"
      ? (body as { token: string }).token
      : "";

  if (await isOnboardingCompleted()) {
    return NextResponse.json(
      { error: "This workspace is already set up. Sign in instead.", completed: true },
      { status: 410 }
    );
  }

  const result = await validateOnboardingInvite(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    boundUid: result.invite.boundUid,
    mapboxConfigured: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim())
  });
}
