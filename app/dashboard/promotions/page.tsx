"use client";

import { useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import Link from "next/link";

import { PromotionsDataTable } from "@/app/dashboard/promotions/data-table";
import { ListPageHeader } from "@/components/list-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLoyaltyPromosEnabled } from "@/hooks/use-loyalty-promos";

export default function PromotionsPage() {
  const { ready, enabled } = useLoyaltyPromosEnabled();
  const [createOpen, setCreateOpen] = useState(false);

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (!enabled) {
    return (
      <>
        <ListPageHeader title="Promotions" />
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Promotions not included</CardTitle>
            <CardDescription>
              Loyalty &amp; promotional tools are not enabled on the current license. Enable the
              feature under Settings → License, or upgrade to a plan that includes it.
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
        title="Promotions"
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusCircledIcon /> Add promotion
          </Button>
        }
      />
      <PromotionsDataTable createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </>
  );
}
