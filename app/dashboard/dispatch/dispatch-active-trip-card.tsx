"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { TripOnTimeBadge } from "@/components/trip-on-time-badge";
import { TripProgressBar } from "@/components/trip-progress-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { formatDateTime } from "@/lib/format";
import { tripPickupReferenceDate, type Trip } from "@/lib/models";
import type { TripProgress } from "@/lib/trip-progress";
import { cn, generateAvatarFallback } from "@/lib/utils";

export function DispatchActiveTripCard({
  trip,
  progress,
  selected,
  chauffeurName,
  chauffeurPhotoURL,
  waitingForGps,
  onSelect
}: {
  trip: Trip;
  progress: TripProgress;
  selected: boolean;
  chauffeurName: string;
  chauffeurPhotoURL?: string | null;
  waitingForGps: boolean;
  onSelect: () => void;
}) {
  const [addressesOpen, setAddressesOpen] = useState(false);

  return (
    <Collapsible
      open={addressesOpen}
      onOpenChange={setAddressesOpen}
      className={cn(
        "border-border hover:bg-muted/60 border-b transition-colors",
        selected && "bg-muted"
      )}>
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className="flex w-full cursor-pointer flex-col gap-3 p-4 text-left">
        <div className="flex items-start gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={chauffeurPhotoURL ?? undefined} alt={chauffeurName} />
            <AvatarFallback>{generateAvatarFallback(chauffeurName)}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {trip.driverID ? (
                  <Link
                    href={`/dashboard/drivers/${trip.driverID}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-foreground block truncate text-sm font-medium hover:underline">
                    {chauffeurName}
                  </Link>
                ) : (
                  <span className="text-foreground block truncate text-sm font-medium">
                    {chauffeurName}
                  </span>
                )}
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formatDateTime(tripPickupReferenceDate(trip))}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <TripOnTimeBadge onTime={progress.onTime} />
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Toggle pickup and destination"
                    aria-expanded={addressesOpen}
                    onClick={(e) => e.stopPropagation()}>
                    {addressesOpen ? (
                      <ChevronDownIcon className="size-4" />
                    ) : (
                      <ChevronRightIcon className="size-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </div>
        </div>

        <TripProgressBar progress={progress} waitingForGps={waitingForGps} />

        <CollapsibleContent>
          <TripRouteStops
            pickup={trip.pickupAddressLine || "Pickup location not set"}
            dropoff={trip.dropoffAddressLine || "Destination not set"}
          />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function RouteStopDot({ variant }: { variant: "pickup" | "dropoff" }) {
  const isPickup = variant === "pickup";
  return (
    <span
      className={cn(
        "flex size-3 shrink-0 items-center justify-center rounded-full border-2",
        isPickup ? "border-primary" : "border-muted-foreground/50"
      )}>
      <span
        className={cn("size-1 rounded-full", isPickup ? "bg-primary" : "bg-muted-foreground/50")}
      />
    </span>
  );
}

function TripRouteStops({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <div className="flex gap-3 pt-1">
      <div className="flex flex-col items-center pt-0.5">
        <RouteStopDot variant="pickup" />
        <span className="border-border min-h-4 flex-1 border-l border-dashed" />
        <RouteStopDot variant="dropoff" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-foreground text-sm font-semibold break-words">{pickup}</p>
        <p className="text-foreground text-sm font-semibold break-words">{dropoff}</p>
      </div>
    </div>
  );
}
