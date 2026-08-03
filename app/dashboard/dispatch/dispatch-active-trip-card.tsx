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
        className="flex w-full cursor-pointer flex-col gap-3 p-4 pb-2 text-left">
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
              <TripOnTimeBadge onTime={progress.onTime} />
            </div>
          </div>
        </div>

        <TripProgressBar progress={progress} waitingForGps={waitingForGps} />
      </div>

      <div className="px-4 pb-4">
        <CollapsibleTrigger
          type="button"
          aria-expanded={journeyOpen}
          className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between gap-2 py-1 text-xs font-medium"
          onClick={(e) => e.stopPropagation()}>
          Journey
          {journeyOpen ? (
            <ChevronDownIcon className="size-4 shrink-0" />
          ) : (
            <ChevronRightIcon className="size-4 shrink-0" />
          )}
        </CollapsibleTrigger>

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

function TripRouteStops({ pickup, dropoff }: { pickup: string; dropoff: string }) {
  return (
    <div className="flex gap-3 pt-2">
      <div className="flex flex-col items-center pt-0.5">
        <span className="border-primary flex size-3 shrink-0 items-center justify-center rounded-full border-2">
          <span className="bg-primary size-1 rounded-full" />
        </span>
        <span className="border-border min-h-4 flex-1 border-l border-dashed" />
        <span className="border-muted-foreground/50 flex size-3 shrink-0 items-center justify-center rounded-full border-2">
          <span className="bg-muted-foreground/50 size-1 rounded-full" />
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-foreground text-sm font-semibold break-words">{pickup}</p>
        <p className="text-foreground text-sm font-semibold break-words">{dropoff}</p>
      </div>
    </div>
  );
}
