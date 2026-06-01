"use client";

import { useMemo, useState } from "react";
import { MoreHorizontalIcon, PlusIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { useTrips } from "@/hooks/use-collections";
import { updateTripStatus } from "@/lib/services/firebase-service";
import {
  TRIP_STATUSES,
  tripPickupReferenceDate,
  tripStatusTitle,
  type TripStatus
} from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { NewBookingSheet } from "@/app/dashboard/bookings/new-booking-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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

export default function BookingsPage() {
  const { trips, loading } = useTrips();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trips.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return [t.customerDisplayName, t.pickupAddressLine, t.dropoffAddressLine, t.customerPhoneNumber]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [trips, search, statusFilter]);

  async function changeStatus(id: string, status: TripStatus) {
    try {
      await updateTripStatus(id, status);
      toast.success(`Marked as ${tripStatusTitle[status]}.`);
    } catch {
      toast.error("Could not update the booking.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bookings"
        description="Manage chauffeur trips across their lifecycle."
        actions={<NewBookingSheet trigger={<Button><PlusIcon /> New booking</Button>} />}
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search customer, address, phone…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TripStatus | "all")}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {TRIP_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tripStatusTitle[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Pickup time</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    Loading bookings…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    No bookings found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.customerDisplayName || "Customer"}</div>
                      {t.customerPhoneNumber && (
                        <div className="text-muted-foreground text-xs">{t.customerPhoneNumber}</div>
                      )}
                    </TableCell>
                    <TableCell>{formatDateTime(tripPickupReferenceDate(t))}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {t.pickupAddressLine || "Pickup"} → {t.dropoffAddressLine || "Drop-off"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.vehicleSnapshot
                        ? `${t.vehicleSnapshot.color} ${t.vehicleSnapshot.make} ${t.vehicleSnapshot.model}`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <TripStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Set status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {TRIP_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              disabled={s === t.status}
                              onClick={() => changeStatus(t.id, s)}>
                              {tripStatusTitle[s]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
