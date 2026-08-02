"use client";

import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";

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
    <Card className="shadow-none">
      <Empty className="border-0 flex-none gap-4 py-8 md:py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Icon />
          </EmptyMedia>
          <EmptyTitle className="text-xl">{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
        {hasAction ? (
          <EmptyContent>
            <Button type="button" size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    </Card>
  );
}
