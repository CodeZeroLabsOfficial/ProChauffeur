"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { MultiSelectField } from "@/components/multi-select-field";
import { useUsers } from "@/hooks/use-collections";
import { createTrip, fetchPricingConfiguration } from "@/lib/services/firebase-service";
import { hasValidCoordinate } from "@/lib/mapbox/coordinates";
import { defaultPricingConfig, type PricingAddon, type Trip, type User } from "@/lib/models";
import { appConfig } from "@/lib/env";
import { formatCurrency } from "@/lib/format";
import { customerDisplayName } from "@/lib/users/customer-display";
import { DateTimePicker } from "@/components/datetime-picker";
import { NumberStepper } from "@/components/number-stepper";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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

const UNASSIGNED_CHAUFFEUR = "__unassigned__";

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

function addonLabel(addon: PricingAddon) {
  return `${addon.title} (${formatCurrency(addon.price, appConfig.currency)})`;
}

export function NewBookingSheet({ trigger }: { trigger: ReactNode }) {
  const { users } = useUsers();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<User | null>(null);
  const [pickup, setPickup] = useState<AddressSuggestion | null>(null);
  const [dropoff, setDropoff] = useState<AddressSuggestion | null>(null);
  const [assignedChauffeur, setAssignedChauffeur] = useState(UNASSIGNED_CHAUFFEUR);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [pricingAddons, setPricingAddons] = useState<PricingAddon[]>(defaultPricingConfig.addons);
  const [passengerCount, setPassengerCount] = useState(1);
  const [smallLuggageCount, setSmallLuggageCount] = useState(0);
  const [largeLuggageCount, setLargeLuggageCount] = useState(0);
  const [scheduledPickupAt, setScheduledPickupAt] = useState<Date | null>(null);

  const chauffeurs = useMemo(
    () =>
      users
        .filter((u) => u.role === "driver")
        .sort((a, b) =>
          (a.profile.displayName || a.email).localeCompare(b.profile.displayName || b.email)
        ),
    [users]
  );

  const addonOptions = useMemo(
    () =>
      pricingAddons.map((addon) => ({
        value: addon.id,
        label: addonLabel(addon)
      })),
    [pricingAddons]
  );

  useEffect(() => {
    if (!open) {
      setCustomer(null);
      setPickup(null);
      setDropoff(null);
      setAssignedChauffeur(UNASSIGNED_CHAUFFEUR);
      setSelectedAddonIds([]);
      setPassengerCount(1);
      setSmallLuggageCount(0);
      setLargeLuggageCount(0);
      setScheduledPickupAt(null);
      return;
    }

    fetchPricingConfiguration()
      .then((config) => setPricingAddons(config.addons))
      .catch(() => setPricingAddons(defaultPricingConfig.addons));
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
    const driverID =
      assignedChauffeur === UNASSIGNED_CHAUFFEUR ? null : assignedChauffeur;
    const bookingAddons = pricingAddons.filter((addon) => selectedAddonIds.includes(addon.id));

    const trip: Trip = {
      id: crypto.randomUUID(),
      status: "requested",
      customerID: customer.id,
      customerDisplayName: customerDisplayName(customer) || null,
      customerPhoneNumber: customer.profile.phoneNumber ?? null,
      customerEmail: customer.email || null,
      driverID,
      pickup: pickup.coordinate,
      dropoff: dropoff.coordinate,
      pickupAddressLine: pickup.addressLine,
      dropoffAddressLine: dropoff.addressLine,
      notes: get("notes") || null,
      bookingPassengerCount: passengerCount,
      bookingSmallLuggageCount: smallLuggageCount,
      bookingLargeLuggageCount: largeLuggageCount,
      bookingAddons: bookingAddons.length ? bookingAddons : null,
      scheduledPickupAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSaving(true);
    try {
      await createTrip(trip);
      toast.success("Booking created.");
      setOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create the booking.";
      toast.error(message);
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <Label htmlFor="scheduledPickupAt">Pickup time</Label>
              <DateTimePicker
                id="scheduledPickupAt"
                value={scheduledPickupAt}
                onChange={setScheduledPickupAt}
                placeholder="Pick pickup time"
                disabled={saving}
              />
            </div>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assignedChauffeur">Assigned chauffeur</Label>
              <Select
                value={assignedChauffeur}
                onValueChange={setAssignedChauffeur}
                disabled={saving}>
                <SelectTrigger id="assignedChauffeur" className="w-full">
                  <SelectValue placeholder="Select chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_CHAUFFEUR}>Unassigned</SelectItem>
                  {chauffeurs.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No chauffeurs available
                    </SelectItem>
                  ) : (
                    chauffeurs.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.profile.displayName || u.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bookingAddons">Add-ons</Label>
              <MultiSelectField
                id="bookingAddons"
                options={addonOptions}
                selected={selectedAddonIds}
                onSelectedChange={setSelectedAddonIds}
                placeholder="Select add-ons"
                emptyMessage="No add-ons configured."
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <NumberStepper
              id="bookingPassengerCount"
              label="Passengers"
              value={passengerCount}
              onChange={setPassengerCount}
              min={1}
              max={20}
              disabled={saving}
            />
            <NumberStepper
              id="bookingSmallLuggageCount"
              label="Small"
              value={smallLuggageCount}
              onChange={setSmallLuggageCount}
              min={0}
              max={20}
              disabled={saving}
            />
            <NumberStepper
              id="bookingLargeLuggageCount"
              label="Large"
              value={largeLuggageCount}
              onChange={setLargeLuggageCount}
              min={0}
              max={20}
              disabled={saving}
            />
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
