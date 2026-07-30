"use client";

import { ArrowRightIcon } from "lucide-react";

import { ComplianceEditButton } from "@/app/dashboard/fleet/components/compliance-edit-button";
import { ComplianceStat } from "@/app/dashboard/fleet/components/compliance-stat";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export function ComplianceTile({
  label,
  secondary,
  start,
  expiry,
  editLabel,
  onEdit,
  onViewDetails
}: {
  label: string;
  secondary?: string | null;
  start?: Date | null;
  expiry?: Date | null;
  editLabel: string;
  onEdit: () => void;
  onViewDetails: () => void;
}) {
  return (
    <Card className="relative gap-4 py-4 pb-0 shadow-none">
      <ComplianceEditButton label={editLabel} onClick={onEdit} className="absolute top-3 right-3" />
      <CardContent className="pe-14">
        <ComplianceStat label={label} secondary={secondary} start={start} expiry={expiry} />
      </CardContent>
      <CardFooter className="border-border mt-auto flex items-center justify-end border-t p-0!">
        <button
          type="button"
          onClick={onViewDetails}
          className="text-primary hover:text-primary/90 flex items-center px-6 py-3 text-sm font-medium">
          View details
          <ArrowRightIcon className="ms-1 size-4" />
        </button>
      </CardFooter>
    </Card>
  );
}
