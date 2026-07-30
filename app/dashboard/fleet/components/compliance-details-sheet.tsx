"use client";

import type { ReactNode } from "react";

import { formatDate } from "@/lib/format";
import { ExpiryBadge, expiryWarning } from "@/components/expiry-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { complianceDaysRemaining } from "@/app/dashboard/fleet/components/compliance-stat";

export type ComplianceDetail = {
  label: string;
  value: ReactNode;
};

export function ComplianceDetailsSheet({
  title,
  description,
  details,
  startLabel,
  start,
  expiry,
  open,
  onOpenChange,
  nested = false
}: {
  title: string;
  description: string;
  details: ComplianceDetail[];
  startLabel: string;
  start?: Date | null;
  expiry?: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nested?: boolean;
}) {
  const warning = expiryWarning(expiry);
  const daysRemaining = complianceDaysRemaining(expiry);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent nested={nested} className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <dl className="divide-y px-4">
          {details.map((detail) => (
            <div key={detail.label} className="flex items-start justify-between gap-4 py-4">
              <dt className="text-muted-foreground text-sm">{detail.label}</dt>
              <dd className="text-end text-sm font-medium">{detail.value || "—"}</dd>
            </div>
          ))}
          <div className="flex items-start justify-between gap-4 py-4">
            <dt className="text-muted-foreground text-sm">{startLabel}</dt>
            <dd className="text-end text-sm font-medium">{formatDate(start)}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-4">
            <dt className="text-muted-foreground text-sm">Expiry date</dt>
            <dd className="text-end text-sm font-medium">{formatDate(expiry)}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-4">
            <dt className="text-muted-foreground text-sm">Days remaining</dt>
            <dd className="text-end text-sm font-medium">{daysRemaining ?? "—"}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-4">
            <dt className="text-muted-foreground text-sm">Status</dt>
            <dd>
              {warning ? (
                <ExpiryBadge level={warning} className="ms-0" />
              ) : (
                <span className="text-sm font-medium">{expiry ? "Current" : "Not set"}</span>
              )}
            </dd>
          </div>
        </dl>
      </SheetContent>
    </Sheet>
  );
}
