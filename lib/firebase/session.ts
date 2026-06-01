import "server-only";

import { cookies } from "next/headers";

import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/firebase/session-cookie";
import type { UserRole } from "@/lib/models/enums";

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/firebase/session-cookie";

export type SessionUser = {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName: string | null;
};

/**
 * Resolves the current admin session from the session cookie.
 *
 * Verifies the Firebase session cookie, then loads `users/{uid}` to read the
 * canonical role (matching the iOS schema, where role lives on the document).
 * Returns `null` when unauthenticated or when the role cannot be resolved.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await adminAuth().verifySessionCookie(cookie, true);
    const snap = await adminFirestore().collection("users").doc(decoded.uid).get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    return {
      uid: decoded.uid,
      email: decoded.email ?? (data.email as string) ?? null,
      role: (data.role as UserRole) ?? "customer",
      displayName: (data.profile?.displayName as string) ?? null
    };
  } catch {
    return null;
  }
}

/** Returns the session user only if they hold the `admin` role, else null. */
export async function getAdminSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  return user?.role === "admin" ? user : null;
}
