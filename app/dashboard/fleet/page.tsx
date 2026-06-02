"use client";

import { useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import { ListPageHeader } from "@/components/list-page-header";
import { Button } from "@/components/ui/button";
import { FleetDataTable } from "@/app/dashboard/fleet/data-table";

export default function FleetPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <ListPageHeader
        title="Fleet"
        actions={
          <Button
            onClick={() => {
              setCreateOpen(true);
            }}>
            <PlusCircledIcon /> Add Vehicle
          </Button>
        }
      />
      <FleetDataTable createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </>
  );
}
