"use client";

import { useMemo } from "react";
import { PieChart, Pie, Label } from "recharts";

import { useInvoices, useTrips } from "@/hooks/use-collections";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import {
  bookingStatusCounts,
  getWeekRange,
  invoiceRevenueInRange
} from "@/app/dashboard/lib/dashboard-metrics";

const chartConfig = {
  confirmed: {
    label: "Confirmed",
    color: "var(--chart-1)"
  },
  active: {
    label: "Active",
    color: "var(--chart-2)"
  },
  completed: {
    label: "Completed",
    color: "var(--chart-4)"
  }
} satisfies ChartConfig;

export function BookingsStatusCard() {
  const { trips } = useTrips();
  const { invoices } = useInvoices();

  const { chartData, total, weekRevenue } = useMemo(() => {
    const counts = bookingStatusCounts(trips);
    const data = [
      { name: "confirmed", value: counts.confirmed, fill: "var(--color-confirmed)" },
      { name: "active", value: counts.active, fill: "var(--color-active)" },
      { name: "completed", value: counts.completed, fill: "var(--color-completed)" }
    ].filter((item) => item.value > 0);

    const week = getWeekRange(new Date(), 0);
    const revenue = invoiceRevenueInRange(invoices, week.start, week.end);

    return {
      chartData: data.length > 0 ? data : [{ name: "confirmed", value: 1, fill: "var(--color-confirmed)" }],
      total: counts.confirmed + counts.active + counts.completed,
      weekRevenue: revenue
    };
  }, [trips, invoices]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6 lg:flex-row">
          <div className="relative shrink-0">
            <ChartContainer config={chartConfig} className="aspect-square h-[250px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle">
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-2xl font-semibold lg:text-3xl">
                              {total.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground">
                              Bookings
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          <div className="flex flex-row gap-3 lg:flex-col">
            {(Object.keys(chartConfig) as Array<keyof typeof chartConfig>).map((item) => (
              <div key={chartConfig[item]?.label} className="flex items-center gap-3">
                <div
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: chartConfig[item].color }}
                />
                <span className="text-xs">{chartConfig[item].label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-center lg:mt-0">
          <p className="text-2xl font-semibold lg:text-3xl">{formatCurrency(weekRevenue)}</p>
          <p className="text-muted-foreground mt-1 text-sm">Total revenue this week</p>
        </div>
      </CardContent>
    </Card>
  );
}
