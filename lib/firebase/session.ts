import "server-only";

import type { DocumentData } from "firebase-admin/firestore";
import { cookies } from "next/headers";

import { parseStaffRole } from "@/lib/auth/staff-access";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { SESSION_COOKIE } from "@/lib/firebase/session-cookie";
import type { StaffRole, UserRole } from "@/lib/models/enums";

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/firebase/session-cookie";

export type SessionUser = {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName: string | null;
  photoURL: string | null;
  staffRole: StaffRole | null;
  canAccessAllBranches: boolean;
  branchIds: string[] | null;
  defaultBranchId: string | null;
};

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.filter((v): v is string => typeof v === "string" && v.length > 0);
  return ids.length ? ids : null;
}

function mapSessionUser(uid: string, email: string | null, data: DocumentData): SessionUser {
  const branchIds = asStringArray(data.branchIds);
  return {
    uid,
    email: email ?? (typeof data.email === "string" ? data.email : null),
    role: (data.role as UserRole) ?? "customer",
    displayName: (data.profile?.displayName as string) ?? null,
    photoURL: (data.profile?.photoURL as string) ?? null,
    staffRole: parseStaffRole(data.staffRole),
    canAccessAllBranches: data.canAccessAllBranches === true,
    branchIds,
    defaultBranchId: typeof data.defaultBranchId === "string" ? data.defaultBranchId : null
  };
}

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
    const ref = adminFirestore().collection("users").doc(decoded.uid);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() ?? {};
    return mapSessionUser(decoded.uid, decoded.email ?? null, data);
  } catch {
    return null;
  }
}

/** Returns the session user only if they hold the `admin` role, else null. */
export async function getAdminSessionUser(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return null;

  if (user.staffRole) return user;

  try {
    await adminFirestore().collection("users").doc(user.uid).update({
      staffRole: "admin",
      canAccessAllBranches: true
    });
  } catch {
    return { ...user, staffRole: "admin", canAccessAllBranches: true };
  }

  return { ...user, staffRole: "admin", canAccessAllBranches: true };
}
