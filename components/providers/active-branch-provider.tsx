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

import {
  getActiveBranchId,
  hydrateActiveBranchId,
  setActiveBranchId as setStoreBranchId,
  subscribeActiveBranch
} from "@/lib/branch/active-branch-store";
import { DEFAULT_BRANCH_ID, type Branch } from "@/lib/models/branch";
import { listenBranches } from "@/lib/services/firebase-service";
import {
  invalidateOperatorLocaleCache,
  invalidatePricingConfigurationCache
} from "@/lib/services/operator-config-cache";

type ActiveBranchContextValue = {
  branchId: string;
  branches: Branch[];
  branchesLoading: boolean;
  setBranchId: (branchId: string) => void;
  activeBranch: Branch | null;
};

const ActiveBranchContext = createContext<ActiveBranchContextValue | null>(null);

export function ActiveBranchProvider({ children }: { children: ReactNode }) {
  const [branchId, setBranchIdState] = useState(DEFAULT_BRANCH_ID);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);

  useEffect(() => {
    setBranchIdState(hydrateActiveBranchId());
    return subscribeActiveBranch(setBranchIdState);
  }, []);

  useEffect(() => {
    const unsub = listenBranches((rows) => {
      setBranches(rows.filter((b) => b.isActive).sort((a, b) => a.name.localeCompare(b.name)));
      setBranchesLoading(false);
    });
    return () => unsub();
  }, []);

  const setBranchId = useCallback((next: string) => {
    setStoreBranchId(next);
    invalidatePricingConfigurationCache();
    invalidateOperatorLocaleCache();
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
