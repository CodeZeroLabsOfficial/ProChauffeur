/** Rejects empty Location ids. Writes must not fall back to a default city. */
export function requireBranchId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("branchId is required.");
  }
  return value.trim();
}

export function parseBranchId(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
