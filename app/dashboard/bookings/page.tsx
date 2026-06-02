"use client";

import { PlusCircledIcon } from "@radix-ui/react-icons";

import { ListPageHeader } from "@/components/list-page-header";
import { NewBookingSheet } from "@/app/dashboard/bookings/new-booking-sheet";
import { BookingsDataTable } from "@/app/dashboard/bookings/data-table";
import { Button } from "@/components/ui/button";

export default function BookingsPage() {
  return (
    <>
      <ListPageHeader
        title="Bookings"
        actions={
          <NewBookingSheet
            trigger={
              <Button>
                <PlusCircledIcon /> Add New Booking
              </Button>
            }
          />
        }
      />
      <BookingsDataTable />
    </>
  );
}
