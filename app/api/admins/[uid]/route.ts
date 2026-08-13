import { NextResponse } from "next/server";

import { parseStaffGrantInput, parseStaffRole, staffGrantFields } from "@/lib/auth/staff-access";
import { requireStaffAdmin } from "@/lib/auth/require-staff";
import { adminAuth, adminFirestore } from "@/lib/firebase/admin";
import { createActivityNotificationAdmin } from "@/lib/firebase/admin-notifications";
import { getAdminSessionUser } from "@/lib/firebase/session";
import { adminNotification } from "@/lib/notifications/messages";

type RouteContext = { params: Promise<{ uid: string }> };

/**
 * PATCH: update a staff member's role and Location grants.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const denied = requireStaffAdmin(session);
  if (denied) return denied;

  const { uid } = await context.params;
  if (!uid) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const userRef = adminFirestore().collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Administrator not found." }, { status: 404 });
  }
  const current = snap.data() ?? {};
  if (current.role !== "admin") {
    return NextResponse.json({ error: "This user is not an administrator." }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const changingRole = "staffRole" in data;
  if (uid === session.uid && changingRole) {
    const nextRole = parseStaffRole(data.staffRole);
    const currentRole = parseStaffRole(current.staffRole) ?? "admin";
    if (nextRole && nextRole !== currentRole) {
      return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 });
    }
  }

  const merged = {
    staffRole: data.staffRole ?? current.staffRole ?? "admin",
    canAccessAllBranches:
      "canAccessAllBranches" in data ? data.canAccessAllBranches : current.canAccessAllBranches === true,
    branchIds: "branchIds" in data ? data.branchIds : current.branchIds,
    defaultBranchId: "defaultBranchId" in data ? data.defaultBranchId : current.defaultBranchId
  };
  const grants = parseStaffGrantInput(merged, session);
  if (!grants.ok) {
    return NextResponse.json({ error: grants.error }, { status: 400 });
  }

  try {
    await userRef.update(staffGrantFields(grants.value));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not update member." }, { status: 500 });
  }
}

/**
 * DELETE: remove an administrator's Firebase Auth account and `users/{uid}` document.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getAdminSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const denied = requireStaffAdmin(session);
  if (denied) return denied;

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

  const adminEmail = (snap.data()?.email as string | undefined)?.trim() || uid;

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

    await createActivityNotificationAdmin(adminNotification("deleted", adminEmail, uid), session);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not revoke administrator." }, { status: 500 });
  }
}
