import { NextResponse } from "next/server";

import { getAdminSessionUser } from "@/lib/firebase/session";
import { adminFirestore } from "@/lib/firebase/admin";
import { isBrandingFontId, DEFAULT_BRANDING_FONT } from "@/lib/fonts-config";
import { AppSettingsDocs, Collections } from "@/lib/models";
import { assertOnboardingSession } from "@/lib/onboarding/server";

/**
 * POST: save workspace appearance during onboarding.
 * Body: { token, workspaceName, primaryColorHex?, fontFamily?, logoUrl?, faviconUrl? }
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

  const workspaceName =
    typeof body.workspaceName === "string" ? body.workspaceName.trim() : "";
  if (!workspaceName) {
    return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  }

  const primaryColorHex =
    typeof body.primaryColorHex === "string" ? body.primaryColorHex.trim() : "";
  const fontRaw = typeof body.fontFamily === "string" ? body.fontFamily.trim() : "";
  const fontFamily = isBrandingFontId(fontRaw) ? fontRaw : DEFAULT_BRANDING_FONT;
  const logoUrl = typeof body.logoUrl === "string" ? body.logoUrl.trim() : "";
  const faviconUrl = typeof body.faviconUrl === "string" ? body.faviconUrl.trim() : "";

  await adminFirestore()
    .collection(Collections.appSettings)
    .doc(AppSettingsDocs.appearance)
    .set(
      {
        workspaceName,
        ...(primaryColorHex ? { primaryColorHex } : {}),
        fontFamily,
        ...(logoUrl ? { logoUrl } : {}),
        ...(faviconUrl ? { faviconUrl } : {})
      },
      { merge: true }
    );

  return NextResponse.json({ ok: true });
}
