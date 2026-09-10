"use client";

import { useEffect, useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import { DriversDataTable } from "@/app/dashboard/drivers/data-table";
import { ListPageHeader } from "@/components/list-page-header";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/use-collections";
import { canAddDriver, type AppLicense } from "@/lib/models";
import { fetchLicense } from "@/lib/services/firebase-service";

export default function DriversPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [license, setLicense] = useState<AppLicense | null>(null);
  const { users } = useUsers();

  useEffect(() => {
    fetchLicense()
      .then(setLicense)
      .catch(() => setLicense(null));
  }, []);

  const driverCount = users.filter((u) => u.role === "driver").length;
  const canAdd = license ? canAddDriver(driverCount, license.maxDrivers) : false;

  return (
    <>
      <ListPageHeader
        title="Drivers"
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={!canAdd}>
            <PlusCircledIcon /> Add Driver
          </Button>
        }
      />
      <DriversDataTable
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        canAdd={canAdd}
      />
    </>
  );
}
