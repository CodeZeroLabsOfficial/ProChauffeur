"use client";

import { RadioIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function DispatchLivePill({
  count,
  ready,
  className
}: {
  count: number;
  ready: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 bg-background/95 shadow-sm backdrop-blur-sm",
        className
      )}>
      <RadioIcon
        className={cn("size-3.5", ready ? "text-green-500" : "text-muted-foreground")}
      />
      {count} live
    </Badge>
  );
}
