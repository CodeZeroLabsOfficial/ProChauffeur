import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";

/**
 * POST: create a Firebase Auth user and `users/{uid}` admin document.
 */
export async function POST(request: Request) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let email: string | undefined;
  let password: string | undefined;
  try {
    ({ email, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const trimmedEmail = email?.trim().toLowerCase();
  if (!trimmedEmail) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
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
        createdAt: FieldValue.serverTimestamp()
      });

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
