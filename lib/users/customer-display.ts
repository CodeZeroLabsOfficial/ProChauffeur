import type { User } from "@/lib/models/user";

export function customerDisplayName(user: User): string {
  return user.profile.displayName?.trim() || user.email;
}

export function customerMatchesQuery(user: User, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = `${customerDisplayName(user)} ${user.email}`.toLowerCase();
  return haystack.includes(q);
}
