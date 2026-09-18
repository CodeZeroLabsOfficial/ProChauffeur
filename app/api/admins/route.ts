import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { validatePasswordPair } from "@/lib/auth/password-strength";
import { parseStaffGrantInput, staffGrantFields } from "@/lib/auth/staff-access";
import { requireStaffAdmin } from "@/lib/auth/require-staff";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { syncStaffAuthClaims } from "@/lib/firebase/admin-staff-claims";
import { createActivityNotificationAdmin } from "@/lib/firebase/admin-notifications";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { adminNotification } from "@/lib/notifications/messages";

/**
 * POST: create a Firebase Auth user and `users/{uid}` admin document.
 */
export async function POST(request: Request) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const denied = requireStaffAdmin(session);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const trimmedEmail =
    typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
  const password = typeof data.password === "string" ? data.password : "";
  const confirmPassword =
    typeof data.confirmPassword === "string" ? data.confirmPassword : "";
  if (!trimmedEmail) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  const passwordCheck = validatePasswordPair(password, confirmPassword);
  if (!passwordCheck.ok) {
    return NextResponse.json({ error: passwordCheck.error }, { status: 400 });
  }

  const grants = parseStaffGrantInput(data, session);
  if (!grants.ok) {
    return NextResponse.json({ error: grants.error }, { status: 400 });
  }

  try {
    const authUser = await adminAuth().createUser({
      email: trimmedEmail,
      password
    });

    await adminFirestore()
      .collection("users")
      .doc(authUser.uid)
      .set({
        id: authUser.uid,
        email: trimmedEmail,
        role: "admin",
        createdAt: FieldValue.serverTimestamp(),
        ...staffGrantFields(grants.value)
      });

    await syncStaffAuthClaims(authUser.uid, grants.value);

    await createActivityNotificationAdmin(
      adminNotification("created", trimmedEmail, authUser.uid),
      session
    );

    return NextResponse.json({ uid: authUser.uid });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (code === "auth/invalid-email") {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (code === "auth/weak-password") {
      return NextResponse.json({ error: "Password is too weak." }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not create administrator." }, { status: 500 });
  }
}
