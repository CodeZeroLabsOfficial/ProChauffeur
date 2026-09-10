import { NextResponse } from "next/server";

import { getAdminSessionUser } from "@/lib/firebase/session";
import {
  assertOnboardingSession,
  completeOnboarding,
  countBranches
} from "@/lib/onboarding/server";

/**
 * POST: mark onboarding complete and consume the invite.
 * Body: { token }
 * Requires at least one Location.
 */
export async function POST(request: Request) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const inviteCheck = await assertOnboardingSession(session.uid, token);
  if (!inviteCheck.ok) {
    return NextResponse.json({ error: inviteCheck.error }, { status: inviteCheck.status });
  }

  const branches = await countBranches();
  if (branches < 1) {
    return NextResponse.json(
      { error: "Create your first Location before finishing onboarding." },
      { status: 400 }
    );
  }

  await completeOnboarding(session.uid);
  return NextResponse.json({ ok: true });
}
