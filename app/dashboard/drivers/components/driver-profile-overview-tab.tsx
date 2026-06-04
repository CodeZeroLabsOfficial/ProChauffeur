"use client";

import Link from "next/link";
import { useMemo } from "react";

import type { Trip } from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { sortTripsByPickupDesc } from "@/app/dashboard/drivers/lib/driver-profile-metrics";
import { DriverProfileTrendChart } from "@/app/dashboard/drivers/components/driver-profile-trend-chart";
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
import { tripPickupReferenceDate } from "@/lib/models/trip";

function shortBookingId(id: string) {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

export function DriverProfileOverviewTab({ trips }: { trips: Trip[] }) {
  const recent = useMemo(() => sortTripsByPickupDesc(trips).slice(0, 8), [trips]);

  return (
    <div className="space-y-4">
      <DriverProfileTrendChart trips={trips} />
      <Card>
        <CardHeader>
          <CardTitle>Recent trips</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/bookings/${trip.id}`}
                        className="font-medium hover:underline">
                        {shortBookingId(trip.id)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(tripPickupReferenceDate(trip))}
                    </TableCell>
                    <TableCell>
                      <TripStatusBadge status={trip.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground px-6 py-8 text-center text-sm">
              No trips assigned to this chauffeur yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
