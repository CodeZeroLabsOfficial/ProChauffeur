"use client";

import { useEffect, useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import { LocationsDataTable } from "@/app/dashboard/locations/data-table";
import { ListPageHeader } from "@/components/list-page-header";
import { Button } from "@/components/ui/button";
import { canCreateLocation, defaultLicense, type AppLicense } from "@/lib/models";
import { fetchLicense, listenBranches } from "@/lib/services/firebase-service";

export default function LocationsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [license, setLicense] = useState<AppLicense | null>(null);
  const [branchCount, setBranchCount] = useState(0);

  useEffect(() => {
    fetchLicense()
      .then(setLicense)
      .catch(() => setLicense(defaultLicense));
  }, []);

  useEffect(() => {
    return listenBranches((rows) => setBranchCount(rows.length));
  }, []);

  const resolved = license ?? defaultLicense;
  const canAdd = canCreateLocation(branchCount, resolved.maxLocations);

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
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        canCreate={canAdd}
      />
    </>
  );
}
