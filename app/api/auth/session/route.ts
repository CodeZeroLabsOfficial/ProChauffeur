import { NextResponse } from "next/server";

import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/firebase/session-cookie";

/**
 * POST: exchange a Firebase ID token for an admin-only session cookie.
 * Verifies the token, enforces `role == admin` (per the iOS users schema),
 * then mints an httpOnly session cookie.
 */
export async function POST(request: Request) {
  let idToken: string | undefined;
  try {
    ({ idToken } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken." }, { status: 400 });
  }

  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    const snap = await adminFirestore().collection("users").doc(decoded.uid).get();
    const role = snap.exists ? (snap.data()?.role as string) : undefined;

    if (role !== "admin") {
      return NextResponse.json(
        { error: "This portal is restricted to administrator accounts." },
        { status: 403 }
      );
    }

    const expiresIn = SESSION_MAX_AGE_SECONDS * 1000;
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      maxAge: SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }
}

/** DELETE: clear the session cookie (sign out). */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
