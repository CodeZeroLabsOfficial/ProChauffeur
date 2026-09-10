import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { getAdminSessionUser } from "@/lib/firebase/session";
import { adminFirestore } from "@/lib/firebase/admin";
import { AppSettingsDocs, Collections } from "@/lib/models";
import { assertOnboardingSession } from "@/lib/onboarding/server";

/**
 * POST: save company profile during onboarding.
 * Body: { token, name, phone, email, street, city, state?, postcode?, country, taxId, website? }
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

  const str = (key: string) =>
    typeof body[key] === "string" ? (body[key] as string).trim() : "";
  const name = str("name");
  const phone = str("phone");
  const email = str("email");
  const street = str("street");
  const city = str("city");
  const state = str("state");
  const postcode = str("postcode");
  const country = str("country");
  const taxId = str("taxId");
  const website = str("website");

  if (!name || !phone || !email || !street || !city || !country || !taxId) {
    return NextResponse.json(
      {
        error:
          "Company name, phone, email, address (street, city, country), and registration number are required."
      },
      { status: 400 }
    );
  }

  await adminFirestore()
    .collection(Collections.appSettings)
    .doc(AppSettingsDocs.company)
    .set(
      {
        name,
        phone,
        email,
        website: website || null,
        taxId,
        street,
        city,
        state: state || null,
        postcode: postcode || null,
        country,
        abn: FieldValue.delete(),
        acn: FieldValue.delete()
      },
      { merge: true }
    );

  return NextResponse.json({ ok: true });
}
