"use client";

import { ComplianceEditButton } from "@/app/dashboard/fleet/components/compliance-edit-button";
import { ComplianceStat } from "@/app/dashboard/fleet/components/compliance-stat";
import { Card, CardContent } from "@/components/ui/card";

export function ComplianceTile({
  label,
  secondary,
  start,
  expiry,
  editLabel,
  onEdit
}: {
  label: string;
  secondary?: string | null;
  start?: Date | null;
  expiry?: Date | null;
  editLabel?: string;
  onEdit?: () => void;
}) {
  const editable = Boolean(editLabel && onEdit);

  return (
    <Card className="relative gap-4 py-4 shadow-none">
      {editable ? (
        <ComplianceEditButton
          label={editLabel!}
          onClick={onEdit!}
          className="absolute top-3 right-3"
        />
      ) : null}
      <CardContent className={editable ? "pe-14" : undefined}>
        <ComplianceStat label={label} secondary={secondary} start={start} expiry={expiry} />
      </CardContent>
    </Card>
  );
}
