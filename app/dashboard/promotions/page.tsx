"use client";

import { useEffect, useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";
import { PencilIcon } from "lucide-react";
import Link from "next/link";

import { PromotionEditSheet } from "@/app/dashboard/promotions/promotion-edit-sheet";
import { ListPageHeader } from "@/components/list-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useLoyaltyPromosEnabled } from "@/hooks/use-loyalty-promos";
import { useVehicleClasses } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";
import type { Branch, Promotion } from "@/lib/models";
import { listenBranches, listenPromotions } from "@/lib/services/firebase-service";

function formatDiscount(promo: Promotion): string {
  if (promo.type === "percent") {
    return `${Math.round(promo.value * 10000) / 100}%`;
  }
  return promo.value.toFixed(2);
}

export default function PromotionsPage() {
  const { ready, enabled } = useLoyaltyPromosEnabled();
  const { vehicleClasses } = useVehicleClasses();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsubPromo = listenPromotions((rows) => {
      setPromotions(rows);
      setLoading(false);
    });
    const unsubBranches = listenBranches(setBranches);
    return () => {
      unsubPromo();
      unsubBranches();
    };
  }, [enabled]);

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(promo: Promotion) {
    setEditing(promo);
    setSheetOpen(true);
  }

  if (!ready) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (!enabled) {
    return (
      <>
        <ListPageHeader title="Promotions" />
        <Card>
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
          <Button onClick={openNew}>
            <PlusCircledIcon /> Add promotion
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Promo codes</CardTitle>
          <CardDescription>
            Company-wide offers with optional Location, schedule, and usage conditions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : promotions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No promotions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => (
                  <TableRow
                    key={promo.id}
                    className={cn(!promo.isEnabled && "text-muted-foreground")}>
                    <TableCell className="font-medium">{promo.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {promo.code}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDiscount(promo)}</TableCell>
                    <TableCell>
                      {promo.redemptionCount}
                      {promo.conditions.maxRedemptions != null
                        ? ` / ${promo.conditions.maxRedemptions}`
                        : ""}
                    </TableCell>
                    <TableCell>{promo.isEnabled ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => openEdit(promo)}>
                        <PencilIcon className="size-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PromotionEditSheet
        promotion={editing}
        branches={branches}
        vehicleClasses={vehicleClasses}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
