import { DEFAULT_BRANCH_ID } from "@/lib/models/branch";

const STORAGE_KEY = "activeBranchId";

type Listener = (branchId: string) => void;

let activeBranchId = DEFAULT_BRANCH_ID;
const listeners = new Set<Listener>();

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

/** Current branch for ops reads/writes (dashboard scope). */
export function getActiveBranchId(): string {
  return activeBranchId;
}

export function setActiveBranchId(branchId: string): void {
  const next = branchId.trim() || DEFAULT_BRANCH_ID;
  if (next === activeBranchId) return;
  activeBranchId = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((fn) => fn(next));
}

/** Hydrate from localStorage once on the client. */
export function hydrateActiveBranchId(): string {
  const stored = readStored();
  if (stored) activeBranchId = stored;
  return activeBranchId;
}

export function subscribeActiveBranch(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
