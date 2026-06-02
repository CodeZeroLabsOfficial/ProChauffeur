"use client";

import { useMemo, useState } from "react";
import { Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import { useInvoices } from "@/hooks/use-collections";
import { formatCurrency } from "@/lib/format";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  endOfDay,
  getMonthRange,
  getWeekRange,
  invoiceRevenueInRange,
  percentChange,
  startOfDay
} from "@/app/dashboard/lib/dashboard-metrics";

type Period = "weekly" | "monthly" | "yearly";

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
    id="stripePattern"
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

function buildWeeklyData(invoices: ReturnType<typeof useInvoices>["invoices"], now: Date) {
  const { start } = getWeekRange(now, 0);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day, index) => {
    const d = startOfDay(new Date(start));
    d.setDate(start.getDate() + index);
    const end = endOfDay(d);
    const revenue = invoiceRevenueInRange(invoices, d, end);
    return { day, revenue, projected: Math.max(revenue * 0.35, 0) };
  });
}

function buildMonthlyData(invoices: ReturnType<typeof useInvoices>["invoices"], now: Date) {
  const { start, end } = getMonthRange(now, 0);
  const weekCount = Math.ceil((end.getDate() - start.getDate() + 1) / 7);
  return Array.from({ length: weekCount }, (_, index) => {
    const weekStart = startOfDay(new Date(start));
    weekStart.setDate(start.getDate() + index * 7);
    const weekEnd = endOfDay(new Date(weekStart));
    weekEnd.setDate(Math.min(weekStart.getDate() + 6, end.getDate()));
    const revenue = invoiceRevenueInRange(invoices, weekStart, weekEnd);
    return { day: `Week ${index + 1}`, revenue, projected: Math.max(revenue * 0.3, 0) };
  });
}

function buildYearlyData(invoices: ReturnType<typeof useInvoices>["invoices"], now: Date) {
  return Array.from({ length: 12 }, (_, index) => {
    const monthStart = startOfDay(new Date(now.getFullYear(), index, 1));
    const monthEnd = endOfDay(new Date(now.getFullYear(), index + 1, 0));
    const revenue = invoiceRevenueInRange(invoices, monthStart, monthEnd);
    const label = new Intl.DateTimeFormat("en-AU", { month: "short" }).format(monthStart);
    return { day: label, revenue, projected: Math.max(revenue * 0.25, 0) };
  });
}

export function RevenueStat() {
  const { invoices } = useInvoices();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("weekly");
  const now = new Date();

  const { data, total, percentageChange } = useMemo(() => {
    let chartData: { day: string; revenue: number; projected: number }[];
    let currentTotal: number;
    let previousTotal: number;

    if (selectedPeriod === "weekly") {
      chartData = buildWeeklyData(invoices, now);
      const thisWeek = getWeekRange(now, 0);
      const lastWeek = getWeekRange(now, -1);
      currentTotal = invoiceRevenueInRange(invoices, thisWeek.start, thisWeek.end);
      previousTotal = invoiceRevenueInRange(invoices, lastWeek.start, lastWeek.end);
    } else if (selectedPeriod === "monthly") {
      chartData = buildMonthlyData(invoices, now);
      const thisMonth = getMonthRange(now, 0);
      const lastMonth = getMonthRange(now, -1);
      currentTotal = invoiceRevenueInRange(invoices, thisMonth.start, thisMonth.end);
      previousTotal = invoiceRevenueInRange(invoices, lastMonth.start, lastMonth.end);
    } else {
      chartData = buildYearlyData(invoices, now);
      const yearStart = startOfDay(new Date(now.getFullYear(), 0, 1));
      const yearEnd = endOfDay(new Date(now.getFullYear(), 11, 31));
      const prevYearStart = startOfDay(new Date(now.getFullYear() - 1, 0, 1));
      const prevYearEnd = endOfDay(new Date(now.getFullYear() - 1, 11, 31));
      currentTotal = invoiceRevenueInRange(invoices, yearStart, yearEnd);
      previousTotal = invoiceRevenueInRange(invoices, prevYearStart, prevYearEnd);
    }

    return {
      data: chartData,
      total: currentTotal,
      percentageChange: percentChange(currentTotal, previousTotal) ?? 0
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, selectedPeriod]);

  const maxRevenue = Math.max(...data.map((d) => d.revenue + d.projected), 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue stat</CardTitle>
        <CardAction>
          <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as Period)}>
            <SelectTrigger>
              <Calendar />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col items-baseline justify-between lg:flex-row">
          <span className="text-2xl font-semibold tracking-tight lg:text-3xl">
            {formatCurrency(total)}
          </span>
          <div className="flex items-center gap-1 text-sm">
            {percentageChange >= 0 ? (
              <TrendingUp className="size-4 text-green-600" />
            ) : (
              <TrendingDown className="size-4 text-red-600" />
            )}
            <span className={percentageChange >= 0 ? "font-medium text-green-600" : "font-medium text-red-600"}>
              {Math.abs(percentageChange).toFixed(0)}%
            </span>
            <span className="text-muted-foreground">from previous period</span>
          </div>
        </div>

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
              fill="url(#stripePattern)"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
