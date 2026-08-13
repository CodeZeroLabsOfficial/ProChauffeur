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
import { DEFAULT_BRANCH_ID, type Branch } from "@/lib/models/branch";
import { listenBranches } from "@/lib/services/firebase-service";

type ActiveBranchContextValue = {
  branchId: string;
  branches: Branch[];
  branchesLoading: boolean;
  setBranchId: (branchId: string) => void;
  activeBranch: Branch | null;
};

const ActiveBranchContext = createContext<ActiveBranchContextValue | null>(null);

export function ActiveBranchProvider({ children }: { children: ReactNode }) {
  const session = useSessionUser();
  const [branchId, setBranchIdState] = useState(DEFAULT_BRANCH_ID);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const grantKey = `${session.canAccessAllBranches}:${(session.branchIds ?? []).join(",")}`;

  useEffect(() => {
    setBranchIdState(hydrateActiveBranchId());
    return subscribeActiveBranch(setBranchIdState);
  }, []);

  useEffect(() => {
    const unsub = listenBranches((rows) => {
      const active = rows.filter((b) => b.isActive).sort((a, b) => a.name.localeCompare(b.name));
      const allowed = new Set(grantedBranchIds(session, active.map((b) => b.id)));
      setBranches(active.filter((b) => allowed.has(b.id)));
      setBranchesLoading(false);
    });
    return () => unsub();
  }, [grantKey, session]);

  useEffect(() => {
    if (branchesLoading) return;
    const grantedIds = branches.map((b) => b.id);
    if (grantedIds.length === 0) return;
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
      branchesLoading,
      setBranchId,
      activeBranch
    }),
    [branchId, branches, branchesLoading, setBranchId, activeBranch]
  );

  return <ActiveBranchContext.Provider value={value}>{children}</ActiveBranchContext.Provider>;
}

export function useActiveBranch(): ActiveBranchContextValue {
  const ctx = useContext(ActiveBranchContext);
  if (!ctx) {
    return {
      branchId: getActiveBranchId(),
      branches: [],
      branchesLoading: false,
      setBranchId: setStoreBranchId,
      activeBranch: null
    };
  }
  return ctx;
}
