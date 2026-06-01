"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { createTrip } from "@/lib/services/firebase-service";
import type { Trip } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";

export function NewBookingSheet({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const num = (k: string) => {
      const v = parseFloat(get(k));
      return Number.isFinite(v) ? v : 0;
    };

    const scheduledRaw = get("scheduledPickupAt");
    const trip: Trip = {
      id: crypto.randomUUID(),
      status: "requested",
      customerID: get("customerID") || crypto.randomUUID(),
      customerDisplayName: get("customerDisplayName") || null,
      customerPhoneNumber: get("customerPhoneNumber") || null,
      customerEmail: get("customerEmail") || null,
      driverID: null,
      pickup: { latitude: num("pickupLat"), longitude: num("pickupLng") },
      dropoff: { latitude: num("dropoffLat"), longitude: num("dropoffLng") },
      pickupAddressLine: get("pickupAddressLine") || null,
      dropoffAddressLine: get("dropoffAddressLine") || null,
      notes: get("notes") || null,
      bookingPassengerCount: get("bookingPassengerCount") ? Number(get("bookingPassengerCount")) : null,
      scheduledPickupAt: scheduledRaw ? new Date(scheduledRaw) : null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSaving(true);
    try {
      await createTrip(trip);
      toast.success("Booking created.");
      setOpen(false);
    } catch {
      toast.error("Could not create the booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>New booking</SheetTitle>
          <SheetDescription>Create a chauffeur trip. It starts in “Requested”.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="customerDisplayName">Customer name</Label>
            <Input id="customerDisplayName" name="customerDisplayName" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customerPhoneNumber">Phone</Label>
              <Input id="customerPhoneNumber" name="customerPhoneNumber" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input id="customerEmail" name="customerEmail" type="email" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddressLine">Pickup address</Label>
            <Input id="pickupAddressLine" name="pickupAddressLine" required />
            <div className="grid grid-cols-2 gap-3">
              <Input name="pickupLat" placeholder="Latitude" inputMode="decimal" />
              <Input name="pickupLng" placeholder="Longitude" inputMode="decimal" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropoffAddressLine">Drop-off address</Label>
            <Input id="dropoffAddressLine" name="dropoffAddressLine" required />
            <div className="grid grid-cols-2 gap-3">
              <Input name="dropoffLat" placeholder="Latitude" inputMode="decimal" />
              <Input name="dropoffLng" placeholder="Longitude" inputMode="decimal" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="scheduledPickupAt">Pickup time</Label>
              <Input id="scheduledPickupAt" name="scheduledPickupAt" type="datetime-local" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingPassengerCount">Passengers</Label>
              <Input id="bookingPassengerCount" name="bookingPassengerCount" type="number" min={1} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create booking"}
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
