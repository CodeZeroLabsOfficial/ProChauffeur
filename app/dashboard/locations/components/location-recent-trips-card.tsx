"use client";

import Link from "next/link";
import { useMemo } from "react";

import { locationRecentTrips } from "@/app/dashboard/locations/lib/location-profile-metrics";
import { TripRouteStops } from "@/components/trip-route-stops";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { tripPickupReferenceDate, type Trip } from "@/lib/models";

export function LocationRecentTripsCard({ trips }: { trips: Trip[] }) {
  const recent = useMemo(() => locationRecentTrips(trips), [trips]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming and recent trips</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">No trips yet for this location.</p>
        ) : (
          <ul className="divide-y">
            {recent.map((trip) => (
              <li key={trip.id} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium tabular-nums">
                    {formatDateTime(tripPickupReferenceDate(trip))}
                  </p>
                  <TripStatusBadge status={trip.status} />
                </div>
                <TripRouteStops
                  pickup={trip.journey.pickupAddressLine || "Pickup location not set"}
                  dropoff={trip.journey.dropoffAddressLine || "Destination not set"}
                />
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
