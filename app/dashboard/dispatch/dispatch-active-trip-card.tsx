"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BriefcaseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LuggageIcon,
  UsersIcon
} from "lucide-react";

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
  vehicleLabel,
  waitingForGps,
  onSelect
}: {
  trip: Trip;
  progress: TripProgress;
  selected: boolean;
  chauffeurName: string;
  chauffeurPhotoURL?: string | null;
  vehicleLabel?: string | null;
  waitingForGps: boolean;
  onSelect: () => void;
}) {
  const [journeyOpen, setJourneyOpen] = useState(false);

  const details = trip.vehicle.vehicleSnapshot?.details;
  const vehicleName =
    [details?.make, details?.model].filter(Boolean).join(" ").trim() ||
    vehicleLabel?.trim() ||
    null;

  const passengerCount = trip.capacity.passengerCount;
  const smallLuggageCount = trip.capacity.luggage.smallCount;
  const largeLuggageCount = trip.capacity.luggage.largeCount;
  const showBookingMeta =
    passengerCount != null || smallLuggageCount != null || largeLuggageCount != null;

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
          <p className="text-foreground text-xs font-semibold">
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
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              {trip.driverID ? (
                <Link
                  href={`/dashboard/drivers/${trip.driverID}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-foreground truncate text-sm font-medium hover:underline">
                  {chauffeurName}
                </Link>
              ) : (
                <span className="text-foreground truncate text-sm font-medium">
                  {chauffeurName}
                </span>
              )}
              <TripOnTimeBadge onTime={progress.onTime} />
            </div>
            {vehicleName ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">{vehicleName}</p>
            ) : null}
            {showBookingMeta ? (
              <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                {passengerCount != null ? (
                  <span className="inline-flex items-center gap-1">
                    <UsersIcon className="size-3.5 shrink-0" aria-hidden />
                    <span className="tabular-nums">{passengerCount}</span>
                    <span className="sr-only">passengers</span>
                  </span>
                ) : null}
                {smallLuggageCount != null ? (
                  <span className="inline-flex items-center gap-1">
                    <BriefcaseIcon className="size-3.5 shrink-0" aria-hidden />
                    <span className="tabular-nums">{smallLuggageCount}</span>
                    <span className="sr-only">small luggage</span>
                  </span>
                ) : null}
                {largeLuggageCount != null ? (
                  <span className="inline-flex items-center gap-1">
                    <LuggageIcon className="size-3.5 shrink-0" aria-hidden />
                    <span className="tabular-nums">{largeLuggageCount}</span>
                    <span className="sr-only">large luggage</span>
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="pt-2">
          <TripProgressBar progress={progress} waitingForGps={waitingForGps} />
        </div>

        <CollapsibleContent>
          <TripRouteStops
            pickup={trip.journey.pickupAddressLine || "Pickup location not set"}
            dropoff={trip.journey.dropoffAddressLine || "Destination not set"}
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
