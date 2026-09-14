"use client";

import Link from "next/link";
import { ChevronLeftIcon } from "lucide-react";

import { useSessionUser } from "@/components/providers/session-provider";
import { useActiveBranch } from "@/components/providers/active-branch-provider";
import { TripChatScreen } from "@/components/trip-chat/trip-chat-screen";
import { useRosterChauffeurs, useTrip, useUsers } from "@/hooks/use-collections";
import { DetailPageShell } from "@/components/layout/detail-page-shell";
import { Button } from "@/components/ui/button";
import { tripChatSenderRoleForUser } from "@/lib/models";

export function TripChatPage({ tripId }: { tripId: string }) {
  const session = useSessionUser();
  const { branchId } = useActiveBranch();
  const { trip, loading, notFound } = useTrip(tripId, branchId);
  const { users } = useUsers();
  const { chauffeurs } = useRosterChauffeurs();

  const backHref = `/dashboard/bookings/${tripId}`;

  if (loading) {
    return (
      <DetailPageShell>
        <p className="text-muted-foreground py-16 text-center text-sm">Loading messages…</p>
      </DetailPageShell>
    );
  }

  if (notFound || !trip) {
    return (
      <DetailPageShell>
        <Button asChild variant="ghost" size="icon-sm" className="bg-background/50 rounded-full">
          <Link href="/dashboard/bookings" aria-label="Back to bookings">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">Booking not found.</p>
      </DetailPageShell>
    );
  }

  const senderRole = tripChatSenderRoleForUser(session.uid, trip.customerID, trip.driverID);
  const chauffeur =
    chauffeurs.find((c) => c.user.id === trip.driverID)?.user ??
    users.find((u) => u.id === trip.driverID);
  const customer = users.find((u) => u.id === trip.customerID);

  const counterpartName =
    senderRole === "driver"
      ? trip.customer.displayName || customer?.profile.displayName || "Passenger"
      : trip.driver.displayName || chauffeur?.profile.displayName || "Chauffeur";
  const counterpartPhotoURL =
    senderRole === "driver"
      ? customer?.profile.photoURL
      : trip.driver.photoURL || chauffeur?.profile.photoURL;

  return (
    <DetailPageShell>
      <TripChatScreen
        trip={trip}
        uid={session.uid}
        counterpartName={counterpartName}
        counterpartPhotoURL={counterpartPhotoURL}
        backHref={backHref}
      />
    </DetailPageShell>
  );
}
