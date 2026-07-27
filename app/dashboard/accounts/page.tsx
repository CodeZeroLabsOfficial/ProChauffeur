"use client";

import { useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import Link from "next/link";

import { AccountsDataTable } from "@/app/dashboard/accounts/data-table";
import { ListPageHeader } from "@/components/list-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFeatureEnabled } from "@/hooks/use-feature-enabled";

export default function AccountsPage() {
  const { ready, enabled } = useFeatureEnabled("corporateAccounts");
  const [createOpen, setCreateOpen] = useState(false);

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (!enabled) {
    return (
      <>
        <ListPageHeader title="Accounts" />
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Accounts not included</CardTitle>
            <CardDescription>
              Corporate accounts are not enabled on the current license. Enable the feature under
              Settings → License, or upgrade to a plan that includes it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/settings/license">Open License</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <ListPageHeader
        title="Accounts"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircledIcon /> Add account
          </Button>
        }
      />
      <AccountsDataTable createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </>
  );
}
