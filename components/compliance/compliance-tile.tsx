"use client";

import type { ReactNode } from "react";

import { ComplianceEditButton } from "@/components/compliance/compliance-edit-button";
import { ComplianceStat } from "@/components/compliance/compliance-stat";
import { Card, CardContent } from "@/components/ui/card";

export function ComplianceTile({
  label,
  secondary,
  start,
  expiry,
  editLabel,
  onEdit,
  children
}: {
  label: string;
  secondary?: string | null;
  start?: Date | null;
  expiry?: Date | null;
  editLabel?: string;
  onEdit?: () => void;
  children?: ReactNode;
}) {
  const editable = Boolean(editLabel && onEdit);

  return (
    <Card className="relative gap-3 py-3 shadow-none">
      {editable ? (
        <ComplianceEditButton
          label={editLabel!}
          onClick={onEdit!}
          className="absolute top-2.5 right-2.5"
        />
      ) : null}
      <CardContent className={editable ? "pe-12" : undefined}>
        <ComplianceStat label={label} secondary={secondary} start={start} expiry={expiry} />
        {children ? <div className="mt-3 space-y-0 border-t pt-1">{children}</div> : null}
      </CardContent>
    </Card>
  );
}
