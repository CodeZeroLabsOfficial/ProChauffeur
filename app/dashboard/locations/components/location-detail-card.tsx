import { formatCurrency } from "@/lib/format";
import type { Branch } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const tabTriggerClassName =
  "data-[state=active]:border-b-primary data-[state=active]:text-foreground text-muted-foreground rounded-none border-0 border-b-2 border-transparent bg-transparent! px-0 py-4 shadow-none!";

function MetaField({
  label,
  value,
  align = "left"
}: {
  label: string;
  value: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <div
      className={
        align === "center"
          ? "text-center"
          : align === "right"
            ? "text-right"
            : "text-left"
      }>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function LocationDetailCard({
  branch,
  statTrips,
  statCompleted,
  statRevenue,
  periodLabel
}: {
  branch: Branch;
  statTrips: number;
  statCompleted: number;
  statRevenue: number;
  periodLabel: string;
}) {
  const revenueLabel =
    statRevenue >= 1000
      ? formatCurrency(statRevenue).replace(/\.\d{2}$/, "")
      : formatCurrency(statRevenue);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="border-b px-4 py-5 sm:px-6 md:px-8 md:py-6">
        <div className="min-w-0 space-y-3">
          <h2 className="text-xl font-bold tracking-tight lg:text-2xl">{branch.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {branch.isActive ? (
              <Badge variant="secondary">Active</Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
            <span className="text-muted-foreground text-sm capitalize">{periodLabel}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 px-4 py-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-3 items-end gap-3">
          <MetaField label="Trips" value={statTrips.toLocaleString()} />
          <MetaField label="Completed" value={statCompleted.toLocaleString()} align="center" />
          <MetaField label="Revenue" value={revenueLabel} align="right" />
        </div>
      </div>

      <div className="border-t">
        <div className="px-4 sm:px-6 md:px-8">
          <TabsList
            className={cn(
              "-mb-0.5 h-auto! w-full justify-start gap-6 overflow-x-auto border-none bg-transparent p-0"
            )}>
            <TabsTrigger value="overview" className={tabTriggerClassName}>
              Overview
            </TabsTrigger>
            <TabsTrigger value="service-area" className={tabTriggerClassName}>
              Service area
            </TabsTrigger>
            <TabsTrigger value="hours" className={tabTriggerClassName}>
              Operating hours
            </TabsTrigger>
            <TabsTrigger value="classes" className={tabTriggerClassName}>
              Vehicle classes
            </TabsTrigger>
            <TabsTrigger value="pricing" className={tabTriggerClassName}>
              Pricing
            </TabsTrigger>
          </TabsList>
        </div>
      </div>
    </div>
  );
}
