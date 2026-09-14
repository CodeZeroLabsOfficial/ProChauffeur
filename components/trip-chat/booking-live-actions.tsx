"use client";

import Link from "next/link";
import { MapPinIcon, MessageSquareIcon, PhoneIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { canCustomerUseTripChatActions, type Trip } from "@/lib/models";

export function BookingLiveActions({
  trip,
  phone,
  chatHref,
  onViewLiveMap
}: {
  trip: Trip;
  phone: string | null;
  chatHref: string;
  onViewLiveMap: () => void;
}) {
  if (!canCustomerUseTripChatActions(trip.status, trip.driverID)) return null;

  const tel = phone?.trim() ? `tel:${phone.trim()}` : null;

  return (
    <div className="bg-background border-border sticky bottom-0 z-10 flex items-center gap-2 border-t p-3">
      <Button type="button" className="min-w-0 flex-1" onClick={onViewLiveMap}>
        <MapPinIcon />
        View live map
      </Button>
      {tel ? (
        <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" asChild>
          <a href={tel} aria-label="Call chauffeur">
            <PhoneIcon />
          </a>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0"
          disabled
          aria-label="Call chauffeur unavailable">
          <PhoneIcon />
        </Button>
      )}
      <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" asChild>
        <Link href={chatHref} aria-label="Message chauffeur">
          <MessageSquareIcon />
        </Link>
      </Button>
    </div>
  );
}
