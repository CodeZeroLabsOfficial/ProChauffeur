import { NextResponse } from "next/server";

import { adminAuth } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";

type RouteContext = { params: Promise<{ uid: string }> };

/**
 * GET: Firebase Auth last sign-in for a user (admin dashboard driver detail).
 */
export async function GET(_request: Request, context: RouteContext) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { uid } = await context.params;
  if (!uid) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  try {
    const record = await adminAuth().getUser(uid);
    const lastSignInAt = record.metadata.lastSignInTime ?? null;
    return NextResponse.json({ lastSignInAt });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "auth/user-not-found") {
      return NextResponse.json({ lastSignInAt: null });
    }
    return NextResponse.json({ error: "Could not load sign-in activity." }, { status: 500 });
  }
}
