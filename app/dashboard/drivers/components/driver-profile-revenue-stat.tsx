"use client";

import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { formatCurrency } from "@/lib/format";
import type { Invoice } from "@/lib/models/invoice";
import {
  overviewPeriodOption,
  overviewRevenueMetrics,
  type DriverOverviewPeriod
} from "@/app/dashboard/drivers/lib/driver-profile-overview-period";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--color-chart-1)"
  },
  projected: {
    label: "Target",
    color: "#d1d5db"
  }
} satisfies ChartConfig;

const StripePattern = () => (
  <pattern
    id="driverOverviewStripePattern"
    patternUnits="userSpaceOnUse"
    width="8"
    height="8"
    patternTransform="rotate(-45)">
    <rect width="8" height="8" fill="var(--muted)" />
    <rect width="4" height="8" fill="var(--background)" />
  </pattern>
);

function formatYAxisTick(value: number) {
  if (value === 0) return "0";
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1000) return `${value / 1000}K`;
  return value.toString();
}

export function DriverProfileRevenueStat({
  invoices,
  period
}: {
  invoices: Invoice[];
  period: DriverOverviewPeriod;
}) {
  const now = useMemo(() => new Date(), []);
  const { data, total, percentageChange } = useMemo(
    () => overviewRevenueMetrics(invoices, period, now),
    [invoices, period, now]
  );

  const maxRevenue = Math.max(...data.map((d) => d.revenue + d.projected), 100);
  const selectedOption = overviewPeriodOption(period);

  return (
    <Card>
      <CardHeader className="grid-cols-[1fr_auto]">
        <CardTitle>Revenue Stat</CardTitle>
        <CardDescription>
          Revenue {selectedOption.label.toLowerCase()}
        </CardDescription>
        <span className="col-start-2 row-start-1 justify-self-end text-2xl font-semibold tracking-tight lg:text-3xl">
          {formatCurrency(total)}
        </span>
        <div className="col-start-2 row-start-2 flex flex-wrap items-center justify-end gap-1 self-center text-sm">
          {percentageChange >= 0 ? (
            <TrendingUp className="size-4 text-green-600" />
          ) : (
            <TrendingDown className="size-4 text-red-600" />
          )}
          <span
            className={
              percentageChange >= 0 ? "font-medium text-green-600" : "font-medium text-red-600"
            }>
            {Math.abs(percentageChange).toFixed(0)}%
          </span>
          <span className="text-muted-foreground">from previous period</span>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <BarChart data={data} margin={{ top: 20, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <StripePattern />
            </defs>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)" }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)" }}
              tickFormatter={formatYAxisTick}
              domain={[0, maxRevenue]}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: name === "revenue" ? "hsl(142 71% 45%)" : "#d1d5db"
                        }}
                      />
                      <span className="text-muted-foreground capitalize">
                        {name === "revenue" ? "Revenue" : "Target"}:
                      </span>
                      <span className="font-medium">{formatCurrency(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <Bar
              dataKey="revenue"
              stackId="stack"
              radius={[0, 0, 4, 4]}
              fill="var(--color-revenue)"
            />
            <Bar
              dataKey="projected"
              stackId="stack"
              radius={[4, 4, 0, 0]}
              fill="url(#driverOverviewStripePattern)"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
