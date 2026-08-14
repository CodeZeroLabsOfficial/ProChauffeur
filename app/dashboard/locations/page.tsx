"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import { LocationsDataTable } from "@/app/dashboard/locations/data-table";
import { ListPageHeader } from "@/components/list-page-header";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { useSessionUser } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { canAccessLocation } from "@/lib/auth/staff-access";
import { canCreateLocation, defaultLicense, type AppLicense } from "@/lib/models";
import { fetchLicense } from "@/lib/services/firebase-service";

export default function LocationsPage() {
  const session = useSessionUser();
  const { allBranches, branchesLoading } = useActiveBranch();
  const [createOpen, setCreateOpen] = useState(false);
  const [license, setLicense] = useState<AppLicense | null>(null);

  useEffect(() => {
    fetchLicense()
      .then(setLicense)
      .catch(() => setLicense(defaultLicense));
  }, []);

  const tableBranches = useMemo(
    () =>
      allBranches
        .filter((branch) => canAccessLocation(session, branch.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allBranches, session]
  );

  const resolved = license ?? defaultLicense;
  const canAdd = canCreateLocation(allBranches.length, resolved.maxLocations);

  return (
    <>
      <ListPageHeader
        title="Locations"
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={!canAdd}>
            <PlusCircledIcon /> Add Location
          </Button>
        }
      />
      <LocationsDataTable
        branches={tableBranches}
        loading={branchesLoading}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        canCreate={canAdd}
      />
    </>
  );
}
