"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { useSessionUser } from "@/components/providers/session-provider";
import {
  getActiveBranchId,
  hydrateActiveBranchId,
  setActiveBranchId as setStoreBranchId,
  subscribeActiveBranch
} from "@/lib/branch/active-branch-store";
import {
  grantedBranchIds,
  resolveGrantedBranchId
} from "@/lib/auth/staff-access";
import { listenBranches, listenGrantedBranches } from "@/lib/services/firebase-service";
import type { Branch } from "@/lib/models/branch";

type ActiveBranchContextValue = {
  branchId: string;
  branches: Branch[];
  allBranches: Branch[];
  branchesLoading: boolean;
  setBranchId: (branchId: string) => void;
  activeBranch: Branch | null;
};

const ActiveBranchContext = createContext<ActiveBranchContextValue | null>(null);

export function ActiveBranchProvider({ children }: { children: ReactNode }) {
  const session = useSessionUser();
  const [branchId, setBranchIdState] = useState("");
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  useEffect(() => {
    setBranchIdState(hydrateActiveBranchId());
    return subscribeActiveBranch(setBranchIdState);
  }, []);

  const grantedIdsKey = session.canAccessAllBranches
    ? "*"
    : (session.branchIds ?? []).join(",");

  useEffect(() => {
    setBranchesLoading(true);
    const apply = (rows: Branch[]) => {
      setAllBranches([...rows].sort((a, b) => a.name.localeCompare(b.name)));
      setBranchesLoading(false);
    };

    if (session.canAccessAllBranches) {
      return listenBranches(apply);
    }

    return listenGrantedBranches(session.branchIds ?? [], apply);
  }, [session.canAccessAllBranches, session.branchIds, grantedIdsKey]);

  const branches = useMemo(() => {
    const active = allBranches.filter((b) => b.isActive);
    const allowed = new Set(grantedBranchIds(session, active.map((b) => b.id)));
    return active.filter((b) => allowed.has(b.id));
  }, [allBranches, session]);

  useEffect(() => {
    if (branchesLoading) return;
    const grantedIds = branches.map((b) => b.id);
    if (grantedIds.length === 0) {
      if (branchId) setStoreBranchId("");
      return;
    }
    const next = resolveGrantedBranchId(session, branchId, grantedIds);
    if (next !== branchId) setStoreBranchId(next);
  }, [branchId, branches, branchesLoading, session]);

  const setBranchId = useCallback((next: string) => {
    setStoreBranchId(next);
  }, []);

  const activeBranch = useMemo(
    () => branches.find((b) => b.id === branchId) ?? null,
    [branches, branchId]
  );

  const value = useMemo(
    () => ({
      branchId,
      branches,
      allBranches,
      branchesLoading,
      setBranchId,
      activeBranch
    }),
    [branchId, branches, allBranches, branchesLoading, setBranchId, activeBranch]
  );

  return <ActiveBranchContext.Provider value={value}>{children}</ActiveBranchContext.Provider>;
}

export function useActiveBranch(): ActiveBranchContextValue {
  const ctx = useContext(ActiveBranchContext);
  if (!ctx) {
    return {
      branchId: getActiveBranchId(),
      branches: [],
      allBranches: [],
      branchesLoading: false,
      setBranchId: setStoreBranchId,
      activeBranch: null
    };
  }
  return ctx;
}
