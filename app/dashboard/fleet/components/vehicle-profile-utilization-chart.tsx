"use client";

import { ActivityIcon } from "lucide-react";

import {
  Card,
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

export function VehicleProfileUtilizationChart() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Utilization rate</CardTitle>
        <CardDescription>Fleet usage over time</CardDescription>
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
