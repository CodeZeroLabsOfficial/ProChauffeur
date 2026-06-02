"use client";

import { useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import { ListPageHeader } from "@/components/list-page-header";
import { Button } from "@/components/ui/button";
import { DriversDataTable } from "@/app/dashboard/drivers/data-table";

export default function DriversPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <ListPageHeader
        title="Drivers"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircledIcon /> Add Driver
          </Button>
        }
      />
      <DriversDataTable createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </>
  );
}
