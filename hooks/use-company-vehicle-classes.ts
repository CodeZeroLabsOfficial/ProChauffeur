"use client";

import { useEffect, useMemo, useState } from "react";

import { useActiveBranch } from "@/components/providers/active-branch-provider";
import {
  unionCompanyVehicleClassOptions,
  type CompanyVehicleClassOption,
  type VehicleClass
} from "@/lib/models";
import { listenVehicleClasses } from "@/lib/services/firebase-service";

type OfferableVehicleClass = CompanyVehicleClassOption & {
  template: VehicleClass;
};

/** Company-wide vehicle class catalogue, deduped by product id. */
export function useCompanyVehicleClasses() {
  const { branches, branchesLoading } = useActiveBranch();
  const [byBranch, setByBranch] = useState<Record<string, VehicleClass[]>>({});
  const branchKey = branches.map((branch) => branch.id).join("|");

  useEffect(() => {
    const ids = new Set(branches.map((branch) => branch.id));
    setByBranch((prev) => {
      const next: Record<string, VehicleClass[]> = {};
      for (const id of Object.keys(prev)) {
        if (ids.has(id)) next[id] = prev[id]!;
      }
      return next;
    });

    const unsubs = branches.map((branch) =>
      listenVehicleClasses((classes) => {
        setByBranch((prev) => ({ ...prev, [branch.id]: classes }));
      }, branch.id)
    );
    return () => unsubs.forEach((unsub) => unsub());
    // branchKey captures identity; `branches` is read for names/ids in the same render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe per Location id set
  }, [branchKey]);

  const options = useMemo(() => {
    const rows: { id: string; displayName: string; locationName: string }[] = [];
    for (const branch of branches) {
      for (const vehicleClass of byBranch[branch.id] ?? []) {
        rows.push({
          id: vehicleClass.id,
          displayName: vehicleClass.displayName,
          locationName: branch.name
        });
      }
    }
    return unionCompanyVehicleClassOptions(rows);
  }, [branches, byBranch]);

  const templates = useMemo(() => {
    const map = new Map<string, VehicleClass>();
    for (const branch of branches) {
      for (const vehicleClass of byBranch[branch.id] ?? []) {
        if (!map.has(vehicleClass.id)) map.set(vehicleClass.id, vehicleClass);
      }
    }
    return map;
  }, [branches, byBranch]);

  const loading =
    branchesLoading || (branches.length > 0 && branches.some((branch) => !(branch.id in byBranch)));

  return { options, templates, loading };
}

/** Products offered in other Locations that this Location does not yet have. */
export function useOfferableVehicleClasses(
  localClasses: Pick<VehicleClass, "id">[]
): { offerable: OfferableVehicleClass[]; loading: boolean } {
  const { options, templates, loading } = useCompanyVehicleClasses();
  const localKey = localClasses.map((row) => row.id).join("|");

  const offerable = useMemo(() => {
    const local = new Set(localClasses.map((row) => row.id));
    const rows: OfferableVehicleClass[] = [];
    for (const option of options) {
      if (local.has(option.id)) continue;
      const template = templates.get(option.id);
      if (!template) continue;
      rows.push({ ...option, template });
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- localKey is the id set
  }, [options, templates, localKey]);

  return { offerable, loading };
}
