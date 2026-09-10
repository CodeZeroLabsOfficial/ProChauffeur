import { NextResponse } from "next/server";

import { getAdminSessionUser } from "@/lib/firebase/session";
import { adminFirestore } from "@/lib/firebase/admin";
import { AppSettingsDocs, Collections } from "@/lib/models";
import { assertOnboardingSession } from "@/lib/onboarding/server";

/**
 * POST: save optional integrations during onboarding (publishable keys only).
 * Body: { token, stripePublishableKey? } — empty / omit is skip.
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

  const stripePublishableKey =
    typeof body.stripePublishableKey === "string" ? body.stripePublishableKey.trim() : "";

  if (stripePublishableKey && !stripePublishableKey.startsWith("pk_")) {
    return NextResponse.json(
      { error: "Stripe publishable key should start with pk_." },
      { status: 400 }
    );
  }

  if (stripePublishableKey) {
    await adminFirestore()
      .collection(Collections.appSettings)
      .doc(AppSettingsDocs.integrations)
      .set({ stripePublishableKey }, { merge: true });
  }

  return NextResponse.json({
    ok: true,
    mapboxConfigured: Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim())
  });
}
