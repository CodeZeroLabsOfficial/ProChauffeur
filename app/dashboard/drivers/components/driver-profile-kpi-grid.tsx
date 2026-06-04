"use client";

import type { LucideIcon } from "lucide-react";
import {
  CalendarCheckIcon,
  CircleDollarSign,
  HandCoinsIcon,
  TruckIcon
} from "lucide-react";

import { formatCurrency } from "@/lib/format";

function KpiBox({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="hover:border-primary/30 bg-muted grid auto-cols-max grid-flow-col gap-4 rounded-lg border p-4">
      <Icon className="size-6 opacity-40" />
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{value}</span>
      </div>
    </div>
  );
}

export function DriverProfileKpiGrid({
  totalTrips,
  completed,
  active,
  monthRevenue
}: {
  totalTrips: number;
  completed: number;
  active: number;
  monthRevenue: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiBox icon={TruckIcon} label="Total trips" value={String(totalTrips)} />
      <KpiBox icon={CalendarCheckIcon} label="Completed" value={String(completed)} />
      <KpiBox icon={HandCoinsIcon} label="Active now" value={String(active)} />
      <KpiBox icon={CircleDollarSign} label="Revenue (month)" value={formatCurrency(monthRevenue)} />
    </div>
  );
}
