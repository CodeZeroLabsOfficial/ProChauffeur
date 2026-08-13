import { STAFF_ROLES, type StaffRole } from "@/lib/models";

export type StaffLocationGrants = {
  staffRole?: StaffRole | null;
  canAccessAllBranches?: boolean | null;
  branchIds?: string[] | null;
  defaultBranchId?: string | null;
};

const LOCATION_EVENT_CATEGORIES = new Set([
  "location",
  "operating_hours",
  "locale",
  "pricing"
]);

const PERSONAL_SETTINGS_PREFIXES = [
  "/dashboard/settings/profile",
  "/dashboard/settings/account",
  "/dashboard/notifications"
] as const;

const DISPATCHER_PREFIXES = [
  "/dashboard/dispatch",
  "/dashboard/bookings",
  "/dashboard/customers",
  "/dashboard/accounts",
  "/dashboard/drivers",
  "/dashboard/fleet",
  ...PERSONAL_SETTINGS_PREFIXES
] as const;

const ACCOUNTS_PREFIXES = [
  "/dashboard/billing",
  "/dashboard/reports",
  "/dashboard/accounts",
  "/dashboard/customers",
  ...PERSONAL_SETTINGS_PREFIXES
] as const;

const SETTINGS_APPEARANCE_HREF = "/dashboard/settings/appearance";
const SETTINGS_PROFILE_HREF = "/dashboard/settings/profile";

export function parseStaffRole(value: unknown): StaffRole | null {
  if (typeof value !== "string") return null;
  return STAFF_ROLES.includes(value as StaffRole) ? (value as StaffRole) : null;
}

export function isStaffAdmin(staffRole: StaffRole | null | undefined): boolean {
  return staffRole === "admin";
}

export function canManageLocations(staffRole: StaffRole | null | undefined): boolean {
  return staffRole === "admin" || staffRole === "manager";
}

function pathMatches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function canUsePath(
  staffRole: StaffRole | null | undefined,
  pathname: string
): boolean {
  const role = parseStaffRole(staffRole);
  const path = (pathname.split("?")[0] ?? pathname).replace(/\/+$/, "") || "/";
  if (path === "/dashboard") return true;
  if (path === "/dashboard/settings") return true;
  if (!role) {
    return PERSONAL_SETTINGS_PREFIXES.some((prefix) => pathMatches(path, prefix));
  }
  if (role === "admin") return true;
  if (role === "manager") return !pathMatches(path, "/dashboard/settings/team");

  const prefixes = role === "dispatcher" ? DISPATCHER_PREFIXES : ACCOUNTS_PREFIXES;
  return prefixes.some((prefix) => pathMatches(path, prefix));
}

export function defaultSettingsHref(staffRole: StaffRole | null | undefined): string {
  return canUsePath(staffRole, SETTINGS_APPEARANCE_HREF)
    ? SETTINGS_APPEARANCE_HREF
    : SETTINGS_PROFILE_HREF;
}

export function canAccessLocation(
  grants: StaffLocationGrants | null | undefined,
  branchId: string
): boolean {
  if (!branchId) return false;
  if (grants?.canAccessAllBranches === true) return true;
  return Array.isArray(grants?.branchIds) && grants.branchIds.includes(branchId);
}

export function grantedBranchIds(
  grants: StaffLocationGrants | null | undefined,
  allIds: string[]
): string[] {
  if (grants?.canAccessAllBranches === true) return allIds;
  const allowed = new Set(grants?.branchIds?.filter(Boolean) ?? []);
  return allIds.filter((id) => allowed.has(id));
}

export function resolveGrantedBranchId(
  grants: StaffLocationGrants | null | undefined,
  currentId: string,
  grantedIds: string[]
): string {
  if (grantedIds.includes(currentId)) return currentId;
  if (grants?.defaultBranchId && grantedIds.includes(grants.defaultBranchId)) {
    return grants.defaultBranchId;
  }
  return grantedIds[0] ?? "";
}

export function canViewActivityEvent(
  grants: StaffLocationGrants | null | undefined,
  event: { category?: string | null; entityId?: string | null; href?: string | null }
): boolean {
  if (!event.category || !LOCATION_EVENT_CATEGORIES.has(event.category)) return true;
  const fromEntity = event.entityId?.trim();
  if (fromEntity) return canAccessLocation(grants, fromEntity);
  const href = event.href ?? "";
  const match = href.match(/\/dashboard\/locations\/([^/?#]+)/);
  if (match?.[1]) return canAccessLocation(grants, decodeURIComponent(match[1]));
  return true;
}

export function locationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/locations\/([^/]+)/);
  if (!match?.[1] || match[1] === "new") return null;
  return decodeURIComponent(match[1]);
}

export type StaffGrantInput = {
  staffRole: StaffRole;
  canAccessAllBranches: boolean;
  branchIds: string[] | null;
  defaultBranchId: string | null;
};

function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0))];
}

export function parseStaffGrantInput(
  body: unknown,
  caller: StaffLocationGrants
): { ok: true; value: StaffGrantInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }
  const data = body as Record<string, unknown>;
  const staffRole = parseStaffRole(data.staffRole);
  if (!staffRole) {
    return { ok: false, error: "Select a staff role." };
  }

  const allLocations = data.canAccessAllBranches === true;
  if (allLocations) {
    if (caller.canAccessAllBranches !== true) {
      return { ok: false, error: "You can only allocate Locations you have access to." };
    }
    const defaultBranchId =
      typeof data.defaultBranchId === "string" && data.defaultBranchId.trim()
        ? data.defaultBranchId.trim()
        : null;
    return {
      ok: true,
      value: {
        staffRole,
        canAccessAllBranches: true,
        branchIds: null,
        defaultBranchId
      }
    };
  }

  const branchIds = uniqueIds(data.branchIds);
  if (branchIds.length === 0) {
    return { ok: false, error: "Allocate at least one Location, or choose All Locations." };
  }
  if (branchIds.some((id) => !canAccessLocation(caller, id))) {
    return { ok: false, error: "You can only allocate Locations you have access to." };
  }
  const requestedDefault =
    typeof data.defaultBranchId === "string" ? data.defaultBranchId.trim() : "";
  const defaultBranchId = branchIds.includes(requestedDefault) ? requestedDefault : branchIds[0];
  return {
    ok: true,
    value: {
      staffRole,
      canAccessAllBranches: false,
      branchIds,
      defaultBranchId
    }
  };
}

export function staffGrantFields(input: StaffGrantInput) {
  return {
    staffRole: input.staffRole,
    canAccessAllBranches: input.canAccessAllBranches,
    branchIds: input.canAccessAllBranches ? null : input.branchIds,
    defaultBranchId: input.defaultBranchId
  };
}
