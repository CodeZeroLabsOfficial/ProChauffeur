import { NextResponse } from "next/server";

import { canAccessLocation, isStaffAdmin } from "@/lib/auth/staff-access";
import type { SessionUser } from "@/lib/firebase/session";

export function requireStaffAdmin(session: SessionUser): NextResponse | null {
  if (isStaffAdmin(session.staffRole)) return null;
  return NextResponse.json(
    { error: "You do not have permission to manage Team." },
    { status: 403 }
  );
}

export function requireLocationAccess(
  session: SessionUser,
  branchId: string
): NextResponse | null {
  if (canAccessLocation(session, branchId)) return null;
  return NextResponse.json(
    { error: "You do not have access to this Location." },
    { status: 403 }
  );
}
