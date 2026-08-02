"use client";

import type { ReactNode } from "react";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ComplianceSectionCard({
  title,
  addLabel,
  onAdd,
  className,
  children
}: {
  title: string;
  addLabel?: string;
  onAdd?: () => void;
  className?: string;
  children: ReactNode;
}) {
  const showAdd = Boolean(addLabel && onAdd);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {showAdd ? (
          <CardAction>
            <Button type="button" variant="outline" size="sm" onClick={onAdd}>
              <PlusIcon />
              {addLabel}
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
