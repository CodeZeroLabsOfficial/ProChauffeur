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
  const [editTrip, setEditTrip] = useState<Trip | null>(null);

  function openNewBooking() {
    setRebookSource(null);
    setEditTrip(null);
    setSheetOpen(true);
  }

  function openRebook(trip: Trip) {
    setEditTrip(null);
    setRebookSource(trip);
    setSheetOpen(true);
  }

  function openEdit(trip: Trip) {
    setRebookSource(null);
    setEditTrip(trip);
    setSheetOpen(true);
  }

  function onSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) {
      setRebookSource(null);
      setEditTrip(null);
    }
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
      <BookingsDataTable onRebook={openRebook} onEdit={openEdit} />
      <NewBookingSheet
        open={sheetOpen}
        onOpenChange={onSheetOpenChange}
        sourceTrip={rebookSource}
        editTrip={editTrip}
      />
    </>
  );
}
