"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ComplianceEmpty({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const hasAction = Boolean(actionLabel && onAction);

  return (
    <Card className="relative gap-3 py-3 shadow-none">
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="bg-muted text-foreground flex size-[100px] shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6">
            <Icon aria-hidden />
          </div>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-muted-foreground text-xs">{description}</p>
            {hasAction ? (
              <div className="pt-1.5">
                <Button type="button" size="sm" onClick={onAction}>
                  {actionLabel}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
