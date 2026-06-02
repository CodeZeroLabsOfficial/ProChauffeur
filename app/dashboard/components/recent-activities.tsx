"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { useTrips } from "@/hooks/use-collections";
import { tripPickupReferenceDate } from "@/lib/models";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { formatDateTime } from "@/lib/format";
import { timeAgo } from "@/app/dashboard/lib/dashboard-metrics";
import type { Trip } from "@/lib/models/trip";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function activityDescription(trip: Trip) {
  const pickup = trip.pickupAddressLine || "Pickup";
  const dropoff = trip.dropoffAddressLine || "Drop-off";
  return `${pickup} → ${dropoff}`;
}

export function RecentActivities() {
  const { trips } = useTrips();
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const items = useMemo(
    () =>
      [...trips]
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 4),
    [trips]
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Recent activities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No recent activity.</p>
          ) : (
            items.map((trip) => {
              const name = trip.customerDisplayName || "Customer";
              return (
                <div
                  key={trip.id}
                  className="hover:bg-muted -mx-2 flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors"
                  onClick={() => setSelectedTrip(trip)}>
                  <Avatar>
                    <AvatarFallback>{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground font-semibold">{name}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {activityDescription(trip)}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-sm whitespace-nowrap">
                    {timeAgo(trip.updatedAt)}
                  </span>
                </div>
              );
            })
          )}

          <div className="mt-4">
            <Button variant="outline" className="w-full" size="sm" asChild>
              <Link href="/dashboard/bookings">
                View all <ChevronRight />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activity details</DialogTitle>
            <DialogDescription>Booking update information</DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarFallback>
                    {initials(selectedTrip.customerDisplayName || "Customer")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">
                    {selectedTrip.customerDisplayName || "Customer"}
                  </p>
                  <TripStatusBadge status={selectedTrip.status} />
                </div>
              </div>
              <div className="space-y-2">
                <p>Route</p>
                <p className="text-muted-foreground text-sm">{activityDescription(selectedTrip)}</p>
              </div>
              <div className="space-y-2">
                <p>Pickup</p>
                <p className="text-muted-foreground text-sm">
                  {formatDateTime(tripPickupReferenceDate(selectedTrip))}
                </p>
              </div>
              <div className="space-y-2">
                <p>Updated</p>
                <p className="text-muted-foreground text-sm">
                  {timeAgo(selectedTrip.updatedAt)} ago
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
