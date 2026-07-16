import { formatCurrency } from "@/lib/format";
import type { Branch } from "@/lib/models";
import { Badge } from "@/components/ui/badge";
import {
  ProfileV2TabBar,
  ProfileV2TabTrigger
} from "@/components/layout/profile-tab-bar";

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

      <ProfileV2TabBar>
        <ProfileV2TabTrigger value="overview">Overview</ProfileV2TabTrigger>
        <ProfileV2TabTrigger value="service-area">Service area</ProfileV2TabTrigger>
        <ProfileV2TabTrigger value="hours">Operating hours</ProfileV2TabTrigger>
        <ProfileV2TabTrigger value="classes">Vehicle classes</ProfileV2TabTrigger>
        <ProfileV2TabTrigger value="pricing">Pricing</ProfileV2TabTrigger>
      </ProfileV2TabBar>
    </div>
  );
}
