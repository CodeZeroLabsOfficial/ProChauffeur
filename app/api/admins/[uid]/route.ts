import { NextResponse } from "next/server";

import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { getAdminSessionUser } from "@/lib/firebase/session";

type RouteContext = { params: Promise<{ uid: string }> };

/**
 * DELETE: remove an administrator's Firebase Auth account and `users/{uid}` document.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { uid } = await context.params;
  if (!uid) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }
  if (uid === session.uid) {
    return NextResponse.json({ error: "You cannot revoke your own admin access." }, { status: 400 });
  }

  const userRef = adminFirestore().collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Administrator not found." }, { status: 404 });
  }
  if (snap.data()?.role !== "admin") {
    return NextResponse.json({ error: "This user is not an administrator." }, { status: 400 });
  }

  try {
    await userRef.delete();

    try {
      await adminAuth().deleteUser(uid);
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "auth/user-not-found") {
        throw err;
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not revoke administrator." }, { status: 500 });
  }
}
