import { NextResponse } from "next/server";

import {
  isOnboardingCompleted,
  LICENSE_NOT_CONFIGURED_MESSAGE,
  loadStampLicense,
  validateOnboardingInvite
} from "@/lib/onboarding/server";

/**
 * POST: validate an onboarding invite token.
 * Body: { token: string }
 *
 * Stamp readiness is ≥1 admin. Mid-wizard resume is allowed when the invite is
 * already bound to that first admin (`boundUid` set).
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

  const license = await loadStampLicense();
  if (!license) {
    return NextResponse.json({ error: LICENSE_NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  const result = await validateOnboardingInvite(token);
  if (!result.ok) {
    const ready = await isOnboardingCompleted();
    return NextResponse.json(
      { error: result.error, ...(ready ? { completed: true } : {}) },
      { status: result.status }
    );
  }

  // Admin already exists and this invite was never started → stamp is handed over.
  if ((await isOnboardingCompleted()) && !result.invite.boundUid) {
    return NextResponse.json(
      { error: "This workspace is already set up. Sign in instead.", completed: true },
      { status: 410 }
    );
  }

  return NextResponse.json({
    ok: true,
    boundUid: result.invite.boundUid,
    mapboxConfigured: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim())
  });
}
