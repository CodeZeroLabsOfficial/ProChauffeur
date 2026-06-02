"use client";

import { useMemo } from "react";
import { CalendarCheckIcon, CarFrontIcon, DollarSign, UsersIcon } from "lucide-react";

import { useInvoices, useTrips, useUsers, useVehicles } from "@/hooks/use-collections";
import { tripPickupReferenceDate } from "@/lib/models";
import { formatCurrency } from "@/lib/format";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  formatPercentChange,
  getMonthRange,
  invoiceRevenueInRange,
  isSameDay,
  percentChange
} from "@/app/dashboard/lib/dashboard-metrics";

function DeltaText({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return <span className="text-muted-foreground">{label}</span>;
  }
  const positive = value >= 0;
  return (
    <>
      <span className={positive ? "text-green-600" : "text-red-600"}>
        {formatPercentChange(value)}{" "}
      </span>
      {label}
    </>
  );
}

export function SummaryCards() {
  const { trips } = useTrips();
  const { users } = useUsers();
  const { vehicles } = useVehicles();
  const { invoices } = useInvoices();

  const metrics = useMemo(() => {
    const now = new Date();
    const thisMonth = getMonthRange(now, 0);
    const lastMonth = getMonthRange(now, -1);

    const todayPickups = trips.filter((t) => isSameDay(tripPickupReferenceDate(t), now)).length;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayPickups = trips.filter((t) =>
      isSameDay(tripPickupReferenceDate(t), yesterday)
    ).length;

    const activeNow = trips.filter(
      (t) => t.status === "in_progress" || t.status === "en_route_pickup"
    ).length;

    const totalPassengers = trips.reduce(
      (sum, t) => sum + (t.bookingPassengerCount ?? 1),
      0
    );
    const monthPassengers = tripsInMonth(trips, thisMonth.start, thisMonth.end).reduce(
      (sum, t) => sum + (t.bookingPassengerCount ?? 1),
      0
    );
    const lastMonthPassengers = tripsInMonth(trips, lastMonth.start, lastMonth.end).reduce(
      (sum, t) => sum + (t.bookingPassengerCount ?? 1),
      0
    );

    const monthRevenue = invoiceRevenueInRange(invoices, thisMonth.start, thisMonth.end);
    const lastMonthRevenue = invoiceRevenueInRange(invoices, lastMonth.start, lastMonth.end);

    const drivers = users.filter((u) => u.role === "driver").length;

    return {
      todayPickups,
      pickupDelta: percentChange(todayPickups, yesterdayPickups),
      activeNow,
      totalPassengers,
      passengerDelta: percentChange(monthPassengers, lastMonthPassengers),
      monthRevenue,
      revenueDelta: percentChange(monthRevenue, lastMonthRevenue),
      fleet: vehicles.length,
      drivers
    };
  }, [trips, users, vehicles, invoices]);

  return (
    <div className="*:data-[slot=card]:from-primary/10 grid gap-4 *:data-[slot=card]:bg-gradient-to-t md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s pick-ups</CardTitle>
          <CardDescription>
            <DeltaText value={metrics.pickupDelta} label="from yesterday" />
          </CardDescription>
          <CardAction>
            <CalendarCheckIcon className="text-muted-foreground/50 size-4 lg:size-6" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="font-display text-2xl lg:text-3xl">{metrics.todayPickups}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active now</CardTitle>
          <CardDescription>En route or in progress</CardDescription>
          <CardAction>
            <CarFrontIcon className="text-muted-foreground/50 size-4 lg:size-6" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="font-display text-2xl lg:text-3xl">{metrics.activeNow}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total passengers</CardTitle>
          <CardDescription>
            <DeltaText value={metrics.passengerDelta} label="from last month" />
          </CardDescription>
          <CardAction>
            <UsersIcon className="text-muted-foreground/50 size-4 lg:size-6" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="font-display text-2xl lg:text-3xl">
            {metrics.totalPassengers.toLocaleString()}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Total revenue</CardTitle>
          <CardDescription>
            <DeltaText value={metrics.revenueDelta} label="from last month" />
          </CardDescription>
          <CardAction>
            <DollarSign className="text-muted-foreground/50 size-4 lg:size-6" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="font-display text-2xl lg:text-3xl">
            {formatCurrency(metrics.monthRevenue)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function tripsInMonth(trips: ReturnType<typeof useTrips>["trips"], start: Date, end: Date) {
  return trips.filter((trip) => {
    const ref = tripPickupReferenceDate(trip);
    return ref >= start && ref <= end;
  });
}
