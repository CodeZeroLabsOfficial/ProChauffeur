"use client";

import Link from "next/link";
import { useMemo } from "react";

import { locationRecentTrips } from "@/app/dashboard/locations/lib/location-profile-metrics";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { tripPickupReferenceDate, type Trip } from "@/lib/models";

export function LocationRecentTripsCard({ trips }: { trips: Trip[] }) {
  const recent = useMemo(() => locationRecentTrips(trips), [trips]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming and recent trips</CardTitle>
        <CardDescription>Next scheduled and latest activity for this location.</CardDescription>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">No trips yet for this location.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((trip) => (
              <li key={trip.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium tabular-nums">
                    {formatDateTime(tripPickupReferenceDate(trip))}
                  </p>
                  <p className="text-muted-foreground truncate text-sm">
                    {trip.pickupAddressLine?.trim() || "Pickup not set"}
                    {trip.dropoffAddressLine?.trim()
                      ? ` → ${trip.dropoffAddressLine.trim()}`
                      : ""}
                  </p>
                </div>
                <TripStatusBadge status={trip.status} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground mt-4 text-sm">
          View all on{" "}
          <Link href="/dashboard/bookings" className="text-foreground underline-offset-4 hover:underline">
            Bookings
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
