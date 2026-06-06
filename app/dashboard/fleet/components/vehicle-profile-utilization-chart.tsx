"use client";

import { ActivityIcon } from "lucide-react";

import { DriverProfileOverviewPeriodSelector } from "@/app/dashboard/drivers/components/driver-profile-overview-period-selector";
import {
  overviewPeriodOption,
  type DriverOverviewPeriod
} from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";

export function VehicleProfileUtilizationChart({
  period,
  onPeriodChange
}: {
  period: DriverOverviewPeriod;
  onPeriodChange: (period: DriverOverviewPeriod) => void;
}) {
  const selectedOption = overviewPeriodOption(period);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Utilization rate</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Fleet usage for the {selectedOption.label.toLowerCase()}
          </span>
          <span className="@[540px]/card:hidden">{selectedOption.shortLabel}</span>
        </CardDescription>
        <CardAction>
          <DriverProfileOverviewPeriodSelector value={period} onChange={onPeriodChange} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Empty className="border-0 py-8 md:py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ActivityIcon />
            </EmptyMedia>
            <EmptyTitle>Utilization tracking coming soon</EmptyTitle>
            <EmptyDescription>
              Daily utilization rate and performance trends for this vehicle will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}
