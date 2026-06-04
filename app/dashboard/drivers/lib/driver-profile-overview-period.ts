import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";
import {
  endOfDay,
  invoiceRevenueInRange,
  percentChange,
  startOfDay,
  tripsInRange
} from "@/app/dashboard/lib/dashboard-metrics";

export type DriverOverviewPeriod = "7d" | "30d" | "90d" | "1y";

export const DRIVER_OVERVIEW_PERIOD_OPTIONS: {
  value: DriverOverviewPeriod;
  label: string;
  shortLabel: string;
  days: number;
}[] = [
  { value: "7d", label: "Last 7 days", shortLabel: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", shortLabel: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", shortLabel: "Last 90 days", days: 90 },
  { value: "1y", label: "Last year", shortLabel: "Last year", days: 365 }
];

export function overviewPeriodDays(period: DriverOverviewPeriod): number {
  return (
    DRIVER_OVERVIEW_PERIOD_OPTIONS.find((o) => o.value === period)?.days ?? 30
  );
}

export function overviewPeriodOption(period: DriverOverviewPeriod) {
  return (
    DRIVER_OVERVIEW_PERIOD_OPTIONS.find((o) => o.value === period) ??
    DRIVER_OVERVIEW_PERIOD_OPTIONS[1]
  );
}

export function rollingWindow(reference: Date, days: number) {
  const end = endOfDay(reference);
  const start = startOfDay(new Date(reference));
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}

export function previousRollingWindow(windowStart: Date, days: number) {
  const prevEnd = endOfDay(new Date(windowStart));
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = startOfDay(new Date(prevEnd));
  prevStart.setDate(prevStart.getDate() - (days - 1));
  return { start: prevStart, end: prevEnd };
}

export function overviewPeriodRanges(period: DriverOverviewPeriod, now = new Date()) {
  const days = overviewPeriodDays(period);
  const current = rollingWindow(now, days);
  const previous = previousRollingWindow(current.start, days);
  return { days, current, previous };
}

export function countBookingsInOverviewPeriod(trips: Trip[], period: DriverOverviewPeriod, now = new Date()) {
  const { current } = overviewPeriodRanges(period, now);
  const inRange = tripsInRange(trips, current.start, current.end);
  const upcoming = inRange.filter(
    (t) =>
      t.status === "requested" ||
      t.status === "accepted" ||
      t.status === "en_route_pickup" ||
      t.status === "in_progress"
  ).length;
  const completed = inRange.filter((t) => t.status === "completed").length;
  return { total: inRange.length, upcoming, completed };
}

function projectedTop(revenue: number, period: DriverOverviewPeriod) {
  const factor = period === "7d" ? 0.35 : period === "30d" ? 0.3 : 0.25;
  return Math.max(revenue * factor, 0);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { month: "short" }).format(date);
}

export function buildOverviewRevenueSeries(
  invoices: Invoice[],
  period: DriverOverviewPeriod,
  now = new Date()
) {
  const days = overviewPeriodDays(period);
  const { end } = rollingWindow(now, days);

  if (days <= 30) {
    return Array.from({ length: days }, (_, index) => {
      const d = startOfDay(new Date(end));
      d.setDate(end.getDate() - (days - 1 - index));
      const dayEnd = endOfDay(d);
      const revenue = invoiceRevenueInRange(invoices, d, dayEnd);
      return { day: formatDayLabel(d), revenue, projected: projectedTop(revenue, period) };
    });
  }

  if (days <= 90) {
    const weekCount = Math.ceil(days / 7);
    return Array.from({ length: weekCount }, (_, index) => {
      const weekEnd = endOfDay(new Date(end));
      weekEnd.setDate(end.getDate() - index * 7);
      const weekStart = startOfDay(new Date(weekEnd));
      weekStart.setDate(weekEnd.getDate() - 6);
      const rangeStart = startOfDay(new Date(end));
      rangeStart.setDate(end.getDate() - (days - 1));
      if (weekStart < rangeStart) weekStart.setTime(rangeStart.getTime());
      const revenue = invoiceRevenueInRange(invoices, weekStart, weekEnd);
      return {
        day: formatDayLabel(weekEnd),
        revenue,
        projected: projectedTop(revenue, period)
      };
    }).reverse();
  }

  const monthCount = 12;
  const bucketDays = Math.ceil(days / monthCount);
  return Array.from({ length: monthCount }, (_, index) => {
    const bucketEnd = endOfDay(new Date(end));
    bucketEnd.setDate(end.getDate() - index * bucketDays);
    const bucketStart = startOfDay(new Date(bucketEnd));
    bucketStart.setDate(bucketEnd.getDate() - (bucketDays - 1));
    const rangeStart = startOfDay(new Date(end));
    rangeStart.setDate(end.getDate() - (days - 1));
    if (bucketStart < rangeStart) bucketStart.setTime(rangeStart.getTime());
    const revenue = invoiceRevenueInRange(invoices, bucketStart, bucketEnd);
    return {
      day: formatMonthLabel(bucketEnd),
      revenue,
      projected: projectedTop(revenue, period)
    };
  }).reverse();
}

export function overviewRevenueMetrics(
  invoices: Invoice[],
  period: DriverOverviewPeriod,
  now = new Date()
) {
  const { current, previous } = overviewPeriodRanges(period, now);
  const currentTotal = invoiceRevenueInRange(invoices, current.start, current.end);
  const previousTotal = invoiceRevenueInRange(invoices, previous.start, previous.end);
  const data = buildOverviewRevenueSeries(invoices, period, now);

  return {
    data,
    total: currentTotal,
    percentageChange: percentChange(currentTotal, previousTotal) ?? 0,
    descriptionLabel: overviewPeriodOption(period).label.toLowerCase()
  };
}
