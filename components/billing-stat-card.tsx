import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type BillingStatChangeType = "positive" | "negative";

export function BillingStatCard({
  label,
  value,
  change,
  changeType
}: {
  label: string;
  value: ReactNode;
  change?: string;
  changeType?: BillingStatChangeType;
}) {
  return (
    <Card className="w-full p-6 py-4">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground text-sm font-medium">{label}</dt>
          {change != null && changeType != null ? (
            <Badge
              variant="outline"
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 ps-2.5 text-xs font-medium",
                changeType === "positive"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              )}>
              {changeType === "positive" ? (
                <TrendingUp className="mr-0.5 -ml-1 size-5 shrink-0 self-center text-green-500" />
              ) : (
                <TrendingDown className="mr-0.5 -ml-1 size-5 shrink-0 self-center text-red-500" />
              )}
              <span className="sr-only">
                {changeType === "positive" ? "Increased" : "Decreased"} by{" "}
              </span>
              {change}
            </Badge>
          ) : null}
        </div>
        <dd className="text-foreground mt-2 text-3xl font-semibold tabular-nums">{value}</dd>
      </CardContent>
    </Card>
  );
}
