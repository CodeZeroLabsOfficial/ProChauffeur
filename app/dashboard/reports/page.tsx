"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { useInvoices, useTrips, useUsers } from "@/hooks/use-collections";
import {
  TRIP_STATUSES,
  tripPickupReferenceDate,
  tripStatusTitle,
  type TripStatus
} from "@/lib/models";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

const STATUS_COLORS: Record<TripStatus, string> = {
  requested: "#f59e0b",
  accepted: "#3b82f6",
  en_route_pickup: "#6366f1",
  in_progress: "#8b5cf6",
  completed: "#22c55e",
  cancelled: "#ef4444"
};

const RANGES = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" }
];

export default function ReportsPage() {
  const { trips } = useTrips();
  const { users } = useUsers();
  const { invoices } = useInvoices();
  const [range, setRange] = useState("30");

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(range, 10));
    return d;
  }, [range]);

  const scoped = useMemo(
    () => trips.filter((t) => tripPickupReferenceDate(t) >= since),
    [trips, since]
  );

  const byStatus = useMemo(
    () =>
      TRIP_STATUSES.map((s) => ({
        status: s,
        label: tripStatusTitle[s],
        count: scoped.filter((t) => t.status === s).length
      })),
    [scoped]
  );

  const completed = scoped.filter((t) => t.status === "completed").length;
  const cancelled = scoped.filter((t) => t.status === "cancelled").length;
  const completionRate = scoped.length ? Math.round((completed / scoped.length) * 100) : 0;
  const cancellationRate = scoped.length ? Math.round((cancelled / scoped.length) * 100) : 0;

  const revenue = useMemo(
    () =>
      invoices
        .filter((i) => i.status === "paid" && i.paidAt && i.paidAt >= since)
        .reduce((sum, i) => sum + i.total, 0),
    [invoices, since]
  );

  const driverPerf = useMemo(() => {
    const nameById = new Map(users.map((u) => [u.id, u.profile.displayName || u.email]));
    const counts = new Map<string, { completed: number; total: number }>();
    for (const t of scoped) {
      if (!t.driverID) continue;
      const c = counts.get(t.driverID) ?? { completed: 0, total: 0 };
      c.total += 1;
      if (t.status === "completed") c.completed += 1;
      counts.set(t.driverID, c);
    }
    return [...counts.entries()]
      .map(([id, c]) => ({ name: nameById.get(id) ?? "Unknown", ...c }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 8);
  }, [scoped, users]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Trips", value: scoped.length },
          { label: "Completion rate", value: `${completionRate}%` },
          { label: "Cancellation rate", value: `${cancellationRate}%` },
          { label: "Revenue (paid)", value: formatCurrency(revenue) }
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <p className="text-muted-foreground text-sm">{k.label}</p>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trips by status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStatus} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip cursor={{ opacity: 0.1 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {byStatus.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status mix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byStatus.filter((s) => s.count > 0)}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}>
                    {byStatus
                      .filter((s) => s.count > 0)
                      .map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                      ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chauffeur performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Assigned trips</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Completion %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driverPerf.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    No assigned trips in this period.
                  </TableCell>
                </TableRow>
              ) : (
                driverPerf.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.total}</TableCell>
                    <TableCell>{d.completed}</TableCell>
                    <TableCell>{d.total ? Math.round((d.completed / d.total) * 100) : 0}%</TableCell>
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
