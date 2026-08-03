"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { TripOnTimeBadge } from "@/components/trip-on-time-badge";
import { TripProgressBar } from "@/components/trip-progress-bar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [journeyOpen, setJourneyOpen] = useState(false);

  return (
    <Collapsible
      open={journeyOpen}
      onOpenChange={setJourneyOpen}
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-foreground text-sm font-semibold">
            {formatDateTime(tripPickupReferenceDate(trip))}
          </p>
          <CollapsibleTrigger
            type="button"
            aria-label="Toggle journey addresses"
            aria-expanded={journeyOpen}
            className="text-muted-foreground hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md"
            onClick={(e) => e.stopPropagation()}>
            {journeyOpen ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </CollapsibleTrigger>
        </div>

        <div className="flex items-start gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={chauffeurPhotoURL ?? undefined} alt={chauffeurName} />
            <AvatarFallback>{generateAvatarFallback(chauffeurName)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
            {trip.driverID ? (
              <Link
                href={`/dashboard/drivers/${trip.driverID}`}
                onClick={(e) => e.stopPropagation()}
                className="text-foreground truncate text-sm font-medium hover:underline">
                {chauffeurName}
              </Link>
            ) : (
              <span className="text-foreground truncate text-sm font-medium">{chauffeurName}</span>
            )}
            <TripOnTimeBadge onTime={progress.onTime} />
          </div>
        </div>

        <div className="pt-2">
          <TripProgressBar progress={progress} waitingForGps={waitingForGps} />
        </div>

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

function RoutePin({ variant }: { variant: "pickup" | "dropoff" }) {
  const isPickup = variant === "pickup";
  return (
    <span
      className={cn(
        "mt-0.5 flex size-3 shrink-0 items-center justify-center rounded-full border-2",
        isPickup ? "border-primary" : "border-muted-foreground/50"
      )}>
      <span
        className={cn(
          "size-1 rounded-full",
          isPickup ? "bg-primary" : "bg-muted-foreground/50"
        )}
      />
    </span>
  );
}

function TripRouteStops({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <div className="flex flex-col pt-1">
      <div className="flex items-start gap-3">
        <div className="flex w-3 shrink-0 flex-col items-center self-stretch">
          <RoutePin variant="pickup" />
          <span className="border-border w-0 flex-1 border-l border-dashed" />
        </div>
        <p className="text-muted-foreground min-w-0 flex-1 pb-4 text-xs break-words">{pickup}</p>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex w-3 shrink-0 justify-center">
          <RoutePin variant="dropoff" />
        </div>
        <p className="text-muted-foreground min-w-0 flex-1 text-xs break-words">{dropoff}</p>
      </div>
    </div>
  );
}
