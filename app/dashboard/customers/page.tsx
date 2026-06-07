"use client";

import { useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import { ListPageHeader } from "@/components/list-page-header";
import { Button } from "@/components/ui/button";
import { CustomersDataTable } from "@/app/dashboard/customers/data-table";

export default function CustomersPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <ListPageHeader
        title="Customers"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircledIcon /> Add Customer
          </Button>
        }
      />
      <CustomersDataTable createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </>
  );
}
