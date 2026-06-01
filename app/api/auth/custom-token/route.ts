import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";

/**
 * GET: mint a Firebase custom token for the current admin session.
 *
 * Bridges the httpOnly session cookie (portal gate) with client-side Firebase
 * Auth so Firestore security rules see `request.auth`.
 */
export async function GET() {
  const user = await getAdminSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const customToken = await adminAuth().createCustomToken(user.uid);
    return NextResponse.json({ customToken });
  } catch {
    return NextResponse.json({ error: "Could not mint token." }, { status: 500 });
  }
}
