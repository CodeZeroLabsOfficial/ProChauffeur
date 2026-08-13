"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AccessBlockedEmpty } from "@/components/access-blocked-empty";
import { useSessionUser } from "@/components/providers/session-provider";
import {
  canAccessLocation,
  canUsePath,
  locationIdFromPath
} from "@/lib/auth/staff-access";

export function StaffAccessGate({ children }: { children: ReactNode }) {
  const user = useSessionUser();
  const pathname = usePathname();

  if (!canUsePath(user.staffRole, pathname)) {
    return <AccessBlockedEmpty />;
  }

  const locationId = locationIdFromPath(pathname);
  if (locationId && !canAccessLocation(user, locationId)) {
    return <AccessBlockedEmpty />;
  }

  return children;
}
