"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { createTrip } from "@/lib/services/firebase-service";
import { hasValidCoordinate } from "@/lib/mapbox/coordinates";
import type { Trip, User } from "@/lib/models";
import { customerDisplayName } from "@/lib/users/customer-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";

function requireAddressSelection(
  label: string,
  selection: AddressSuggestion | null
): selection is AddressSuggestion {
  if (!selection?.addressLine.trim()) {
    toast.error(`Enter a ${label} address.`);
    return false;
  }
  if (!hasValidCoordinate(selection.coordinate)) {
    toast.error(`Choose a ${label} address from the suggestions.`);
    return false;
  }
  return true;
}

function requireCustomerSelection(customer: User | null): customer is User {
  if (!customer) {
    toast.error("Choose a customer from the directory.");
    return false;
  }
  if (customer.role !== "customer") {
    toast.error("Choose a customer from the directory.");
    return false;
  }
  return true;
}

export function NewBookingSheet({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<User | null>(null);
  const [pickup, setPickup] = useState<AddressSuggestion | null>(null);
  const [dropoff, setDropoff] = useState<AddressSuggestion | null>(null);

  useEffect(() => {
    if (!open) {
      setCustomer(null);
      setPickup(null);
      setDropoff(null);
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !requireCustomerSelection(customer) ||
      !requireAddressSelection("pickup", pickup) ||
      !requireAddressSelection("drop-off", dropoff)
    ) {
      return;
    }

    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();

    const scheduledRaw = get("scheduledPickupAt");
    const trip: Trip = {
      id: crypto.randomUUID(),
      status: "requested",
      customerID: customer.id,
      customerDisplayName: customerDisplayName(customer) || null,
      customerPhoneNumber: customer.profile.phoneNumber ?? null,
      customerEmail: customer.email || null,
      driverID: null,
      pickup: pickup.coordinate,
      dropoff: dropoff.coordinate,
      pickupAddressLine: pickup.addressLine,
      dropoffAddressLine: dropoff.addressLine,
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
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <CustomerAutocomplete
              id="customer"
              value={customer}
              onChange={setCustomer}
              placeholder="Search customers…"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddressLine">Pickup address</Label>
            <AddressAutocomplete
              id="pickupAddressLine"
              value={pickup}
              onChange={setPickup}
              placeholder="Search pickup address…"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropoffAddressLine">Drop-off address</Label>
            <AddressAutocomplete
              id="dropoffAddressLine"
              value={dropoff}
              onChange={setDropoff}
              placeholder="Search drop-off address…"
              required
            />
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
