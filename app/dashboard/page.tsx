"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { CalendarCheckIcon, CarFrontIcon, RouteIcon, UsersIcon } from "lucide-react";

import { useInvoices, useTrips, useUsers, useVehicles } from "@/hooks/use-collections";
import { tripPickupReferenceDate, upcomingTripStatuses } from "@/lib/models";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  hint
}: {
  title: string;
  value: string | number;
  icon: typeof UsersIcon;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
        <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-lg">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { trips } = useTrips();
  const { users } = useUsers();
  const { vehicles } = useVehicles();
  const { invoices } = useInvoices();

  const now = new Date();

  const stats = useMemo(() => {
    const today = trips.filter((t) => isSameDay(tripPickupReferenceDate(t), now)).length;
    const active = trips.filter((t) => t.status === "in_progress" || t.status === "en_route_pickup")
      .length;
    const drivers = users.filter((u) => u.role === "driver").length;
    const monthRevenue = invoices
      .filter((i) => i.status === "paid" && i.paidAt && i.paidAt.getMonth() === now.getMonth())
      .reduce((sum, i) => sum + i.total, 0);
    return { today, active, drivers, fleet: vehicles.length, monthRevenue };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, users, vehicles, invoices]);

  const chartData = useMemo(() => {
    const days: { label: string; date: Date; trips: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({
        label: new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "short" }).format(d),
        date: d,
        trips: 0
      });
    }
    for (const t of trips) {
      const ref = tripPickupReferenceDate(t);
      const bucket = days.find((day) => isSameDay(day.date, ref));
      if (bucket) bucket.trips += 1;
    }
    return days;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips]);

  const upcoming = useMemo(
    () =>
      trips
        .filter((t) => upcomingTripStatuses.includes(t.status))
        .sort(
          (a, b) =>
            tripPickupReferenceDate(a).getTime() - tripPickupReferenceDate(b).getTime()
        )
        .slice(0, 8),
    [trips]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of today's chauffeur operations across dispatch, bookings and fleet."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Trips today" value={stats.today} icon={CalendarCheckIcon} />
        <StatCard title="Active now" value={stats.active} icon={RouteIcon} hint="En route / in progress" />
        <StatCard title="Chauffeurs" value={stats.drivers} icon={UsersIcon} />
        <StatCard title="Fleet vehicles" value={stats.fleet} icon={CarFrontIcon} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bookings overview</CardTitle>
            <span className="text-muted-foreground text-sm">Last 14 days</span>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="fillTrips" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="trips"
                    stroke="var(--primary)"
                    fill="url(#fillTrips)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>This month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-muted-foreground text-sm">Revenue (paid invoices)</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.monthRevenue)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Completed</p>
                <p className="text-lg font-semibold">
                  {trips.filter((t) => t.status === "completed").length}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-muted-foreground">Cancelled</p>
                <p className="text-lg font-semibold">
                  {trips.filter((t) => t.status === "cancelled").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming trips</CardTitle>
          <Link href="/dashboard/bookings" className="text-primary text-sm hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcoming.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    No upcoming trips.
                  </TableCell>
                </TableRow>
              ) : (
                upcoming.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.customerDisplayName || "Customer"}
                    </TableCell>
                    <TableCell>{formatDateTime(tripPickupReferenceDate(t))}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {t.pickupAddressLine || "Pickup"} → {t.dropoffAddressLine || "Drop-off"}
                    </TableCell>
                    <TableCell>
                      <TripStatusBadge status={t.status} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
