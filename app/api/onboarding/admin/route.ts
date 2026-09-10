import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { validatePasswordPair } from "@/lib/auth/password-strength";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { Collections, UNLIMITED } from "@/lib/models";
import {
  bindInviteToUid,
  countAdminUsers,
  loadStampLicense,
  validateOnboardingInvite
} from "@/lib/onboarding/server";

/**
 * POST: create the first admin from a valid onboarding invite.
 * Body: { token, email, password, confirmPassword, firstName, lastName, phone, address? }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const street = typeof body.street === "string" ? body.street.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";
  const postcode = typeof body.postcode === "string" ? body.postcode.trim() : "";
  const country = typeof body.country === "string" ? body.country.trim() : "";

  const inviteCheck = await validateOnboardingInvite(token);
  if (!inviteCheck.ok) {
    return NextResponse.json({ error: inviteCheck.error }, { status: inviteCheck.status });
  }
  if (inviteCheck.invite.boundUid) {
    return NextResponse.json(
      { error: "An administrator was already created for this invite. Continue with that account." },
      { status: 409 }
    );
  }

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Phone is required." }, { status: 400 });
  }
  if (!street || !city || !country) {
    return NextResponse.json({ error: "Address (street, city, country) is required." }, { status: 400 });
  }

  const passwordCheck = validatePasswordPair(password, confirmPassword);
  if (!passwordCheck.ok) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  const license = await loadStampLicense();
  const adminCount = await countAdminUsers();
  if (license.maxAdmins < UNLIMITED && adminCount >= license.maxAdmins) {
    return NextResponse.json(
      { error: `Admin limit reached (${license.maxAdmins}).` },
      { status: 409 }
    );
  }

  try {
    const authUser = await adminAuth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`.trim()
    });

    const displayName = `${firstName} ${lastName}`.trim();
    await adminFirestore()
      .collection(Collections.users)
      .doc(authUser.uid)
      .set({
        id: authUser.uid,
        email,
        role: "admin",
        staffRole: "admin",
        canAccessAllBranches: true,
        branchIds: null,
        defaultBranchId: null,
        profile: {
          displayName,
          firstName,
          lastName,
          phoneNumber: phone,
          address: {
            street,
            city,
            state: state || null,
            postcode: postcode || null,
            country
          }
        },
        createdAt: FieldValue.serverTimestamp()
      });

    await bindInviteToUid(authUser.uid);

    const customToken = await adminAuth().createCustomToken(authUser.uid);
    // Client signs in with custom token, then exchanges idToken — or we mint session via custom path.
    // Prefer: return customToken; client signs in; client POSTs /api/auth/session.
    // Also mint session if client sends back... Plan says mint session cookie here.
    // Firebase Admin cannot create session cookie without an ID token. Return customToken
    // and let client complete session, OR use signInWithCustomToken on a temporary approach.
    // We'll return customToken; onboarding UI will signInWithCustomToken then POST session.

    return NextResponse.json({ uid: authUser.uid, customToken });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    if (code === "auth/invalid-email") {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (code === "auth/weak-password") {
      return NextResponse.json({ error: "Password is too weak." }, { status: 400 });
    }
    console.error("onboarding admin create failed", err);
    return NextResponse.json({ error: "Could not create administrator." }, { status: 500 });
  }
}
