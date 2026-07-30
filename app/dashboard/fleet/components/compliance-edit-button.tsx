"use client";

import { PencilIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function ComplianceEditButton({
  label,
  onClick,
  className
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("z-10", className)}
      onClick={onClick}
      aria-label={label}>
      <PencilIcon />
    </Button>
  );
}
