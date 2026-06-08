"use client";

import { useState } from "react";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import { ListPageHeader } from "@/components/list-page-header";
import { NewBookingSheet } from "@/app/dashboard/bookings/new-booking-sheet";
import { BookingsDataTable } from "@/app/dashboard/bookings/data-table";
import { Button } from "@/components/ui/button";
import type { Trip } from "@/lib/models";

export default function BookingsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rebookSource, setRebookSource] = useState<Trip | null>(null);

  function openNewBooking() {
    setRebookSource(null);
    setSheetOpen(true);
  }

  function openRebook(trip: Trip) {
    setRebookSource(trip);
    setSheetOpen(true);
  }

  return (
    <>
      <ListPageHeader
        title="Bookings"
        actions={
          <Button onClick={openNewBooking}>
            <PlusCircledIcon /> Add New Booking
          </Button>
        }
      />
      <BookingsDataTable onRebook={openRebook} />
      <NewBookingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        sourceTrip={rebookSource}
      />
    </>
  );
}
