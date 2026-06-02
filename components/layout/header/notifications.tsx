"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { BellIcon, ClockIcon } from "lucide-react";
import { toast } from "sonner";

import { useIsMobile } from "@/hooks/use-mobile";
import { useTrips, useUsers } from "@/hooks/use-collections";
import { formatTime } from "@/lib/format";
import type { Trip } from "@/lib/models";
import { updateTripStatus } from "@/lib/services/firebase-service";
import { generateAvatarFallback } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

function bookingRequestDescription(trip: Trip) {
  const pickup = trip.pickupAddressLine?.trim() || "Pickup";
  const dropoff = trip.dropoffAddressLine?.trim() || "Drop-off";
  return `${pickup} → ${dropoff}`;
}

function customerNameForTrip(trip: Trip, displayNameByCustomerId: Map<string, string>) {
  const fromTrip = trip.customerDisplayName?.trim();
  if (fromTrip) return fromTrip;
  const fromUser = displayNameByCustomerId.get(trip.customerID);
  if (fromUser) return fromUser;
  return "Customer";
}

export function HeaderNotifications() {
  const isMobile = useIsMobile();
  const { trips } = useTrips();
  const { users } = useUsers();
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const displayNameByCustomerId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      const name = u.profile.displayName?.trim() || u.email;
      if (name) map.set(u.id, name);
    }
    return map;
  }, [users]);

  const photoURLByCustomerId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      const url = u.profile.photoURL?.trim();
      if (url) map.set(u.id, url);
    }
    return map;
  }, [users]);

  const requestedBookings = useMemo(
    () =>
      trips
        .filter((t) => t.status === "requested")
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [trips]
  );

  const handleStatusChange = useCallback(
    async (tripId: string, status: "accepted" | "cancelled") => {
      setActingOnId(tripId);
      try {
        await updateTripStatus(tripId, status);
        toast.success(status === "accepted" ? "Booking accepted." : "Booking declined.");
      } catch {
        toast.error("Could not update the booking.");
      } finally {
        setActingOnId(null);
      }
    },
    []
  );

  const pendingCount = requestedBookings.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" className="relative" aria-label="Notifications">
          <BellIcon />
          {pendingCount > 0 ? (
            <span className="bg-destructive absolute end-0.5 top-0.5 block size-1.5 shrink-0 rounded-full" />
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={isMobile ? "center" : "end"} className="ms-4 w-80 p-0">
        <DropdownMenuLabel className="bg-background dark:bg-muted sticky top-0 z-10 p-0">
          <div className="flex justify-between border-b px-6 py-4">
            <div className="font-medium">Notifications</div>
            {pendingCount > 0 ? (
              <span className="text-muted-foreground text-sm">{pendingCount} pending</span>
            ) : null}
          </div>
        </DropdownMenuLabel>

        <ScrollArea className="h-[350px]">
          {requestedBookings.length === 0 ? (
            <p className="text-muted-foreground px-6 py-8 text-center text-sm">No pending booking requests.</p>
          ) : (
            requestedBookings.map((trip) => {
              const title = customerNameForTrip(trip, displayNameByCustomerId);
              const avatarUrl = photoURLByCustomerId.get(trip.customerID);
              const busy = actingOnId === trip.id;

              return (
                <DropdownMenuItem
                  key={trip.id}
                  className="group flex cursor-pointer items-start gap-9 rounded-none border-b px-4 py-3"
                  asChild>
                  <Link href={`/dashboard/bookings/${trip.id}`}>
                    <div className="flex flex-1 items-start gap-2">
                      <div className="flex-none">
                        <Avatar className="size-8">
                          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
                          <AvatarFallback>{generateAvatarFallback(title)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="truncate text-sm font-medium dark:group-hover:text-default-800">
                          {title}
                        </div>
                        <div className="text-muted-foreground line-clamp-1 text-xs dark:group-hover:text-default-700">
                          Requested a new booking
                        </div>
                        <div className="text-muted-foreground/80 line-clamp-1 text-xs">
                          {bookingRequestDescription(trip)}
                        </div>
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.preventDefault()}>
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={busy}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleStatusChange(trip.id, "accepted");
                            }}>
                            Accept
                          </Button>
                          <Button
                            size="xs"
                            variant="destructive"
                            disabled={busy}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleStatusChange(trip.id, "cancelled");
                            }}>
                            Decline
                          </Button>
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1 text-xs dark:group-hover:text-default-500">
                          <ClockIcon className="size-3!" />
                          {formatTime(trip.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex-0">
                      <span className="bg-destructive/80 block size-2 rounded-full border" />
                    </div>
                  </Link>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
