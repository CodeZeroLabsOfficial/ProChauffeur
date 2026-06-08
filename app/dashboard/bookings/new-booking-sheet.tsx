"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { MultiSelectField } from "@/components/multi-select-field";
import { useUsers, useVehicles } from "@/hooks/use-collections";
import { createTrip, fetchPricingConfiguration } from "@/lib/services/firebase-service";
import { hasValidCoordinate } from "@/lib/mapbox/coordinates";
import {
  defaultPricingConfig,
  effectiveChauffeurUserId,
  type CoordinateField,
  type PricingAddon,
  type Trip,
  type User,
  type Vehicle
} from "@/lib/models";
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

type RequiredField = "customer" | "scheduledPickupAt" | "pickup" | "dropoff";

type FieldErrors = Partial<Record<RequiredField, boolean>>;

function addonLabel(addon: PricingAddon) {
  return `${addon.title} (${formatCurrency(addon.price, appConfig.currency)})`;
}

function vehicleForChauffeur(vehicles: Vehicle[], chauffeurUserId: string): Vehicle | undefined {
  return vehicles.find((vehicle) => effectiveChauffeurUserId(vehicle) === chauffeurUserId);
}

function isValidCustomer(customer: User | null): customer is User {
  return Boolean(customer && customer.role === "customer");
}

function isValidAddressSelection(selection: AddressSuggestion | null): selection is AddressSuggestion {
  return Boolean(
    selection?.addressLine.trim() && hasValidCoordinate(selection.coordinate)
  );
}

function isValidScheduledPickup(scheduledPickupAt: Date | null): scheduledPickupAt is Date {
  return Boolean(scheduledPickupAt && !Number.isNaN(scheduledPickupAt.getTime()));
}

function collectFieldErrors(
  customer: User | null,
  pickup: AddressSuggestion | null,
  dropoff: AddressSuggestion | null,
  scheduledPickupAt: Date | null
): FieldErrors {
  return {
    customer: !isValidCustomer(customer),
    scheduledPickupAt: !isValidScheduledPickup(scheduledPickupAt),
    pickup: !isValidAddressSelection(pickup),
    dropoff: !isValidAddressSelection(dropoff)
  };
}

function hasFieldErrors(errors: FieldErrors) {
  return Object.values(errors).some(Boolean);
}

function addressFromTrip(
  addressLine: string | null | undefined,
  coordinate: CoordinateField
): AddressSuggestion | null {
  if (!addressLine?.trim() || !hasValidCoordinate(coordinate)) return null;
  return {
    id: `trip-${coordinate.latitude}-${coordinate.longitude}`,
    addressLine: addressLine.trim(),
    coordinate
  };
}

function resetFormFields(
  setters: {
    setFieldErrors: (errors: FieldErrors) => void;
    setCustomer: (customer: User | null) => void;
    setPickup: (pickup: AddressSuggestion | null) => void;
    setDropoff: (dropoff: AddressSuggestion | null) => void;
    setAssignedChauffeur: (chauffeur: string) => void;
    setSelectedAddonIds: (ids: string[]) => void;
    setPassengerCount: (count: number) => void;
    setSmallLuggageCount: (count: number) => void;
    setLargeLuggageCount: (count: number) => void;
    setScheduledPickupAt: (date: Date | null) => void;
    setNotes: (notes: string) => void;
  }
) {
  setters.setFieldErrors({});
  setters.setCustomer(null);
  setters.setPickup(null);
  setters.setDropoff(null);
  setters.setAssignedChauffeur(UNASSIGNED_CHAUFFEUR);
  setters.setSelectedAddonIds([]);
  setters.setPassengerCount(1);
  setters.setSmallLuggageCount(0);
  setters.setLargeLuggageCount(0);
  setters.setScheduledPickupAt(null);
  setters.setNotes("");
}

export function NewBookingSheet({
  trigger,
  open,
  onOpenChange,
  sourceTrip = null
}: {
  trigger?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTrip?: Trip | null;
}) {
  const { users } = useUsers();
  const { vehicles } = useVehicles();
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
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
  const [notes, setNotes] = useState("");

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

  function clearFieldError(field: RequiredField) {
    setFieldErrors((prev) => ({ ...prev, [field]: false }));
  }

  useEffect(() => {
    const setters = {
      setFieldErrors,
      setCustomer,
      setPickup,
      setDropoff,
      setAssignedChauffeur,
      setSelectedAddonIds,
      setPassengerCount,
      setSmallLuggageCount,
      setLargeLuggageCount,
      setScheduledPickupAt,
      setNotes
    };

    if (!open) {
      resetFormFields(setters);
      return;
    }

    fetchPricingConfiguration()
      .then((config) => setPricingAddons(config.addons))
      .catch(() => setPricingAddons(defaultPricingConfig.addons));

    if (sourceTrip) {
      const matchedCustomer =
        users.find((u) => u.id === sourceTrip.customerID && u.role === "customer") ?? null;
      if (!matchedCustomer) {
        toast.warning("Customer no longer found — select a customer.");
      }

      const chauffeurIds = new Set(users.filter((u) => u.role === "driver").map((u) => u.id));
      const chauffeur =
        sourceTrip.driverID && chauffeurIds.has(sourceTrip.driverID)
          ? sourceTrip.driverID
          : UNASSIGNED_CHAUFFEUR;

      setFieldErrors({});
      setCustomer(matchedCustomer);
      setPickup(addressFromTrip(sourceTrip.pickupAddressLine, sourceTrip.pickup));
      setDropoff(addressFromTrip(sourceTrip.dropoffAddressLine, sourceTrip.dropoff));
      setAssignedChauffeur(chauffeur);
      setSelectedAddonIds(sourceTrip.bookingAddons?.map((addon) => addon.id) ?? []);
      setPassengerCount(sourceTrip.bookingPassengerCount ?? 1);
      setSmallLuggageCount(sourceTrip.bookingSmallLuggageCount ?? 0);
      setLargeLuggageCount(sourceTrip.bookingLargeLuggageCount ?? 0);
      setScheduledPickupAt(null);
      setNotes(sourceTrip.notes ?? "");
      return;
    }

    resetFormFields(setters);
  }, [open, sourceTrip, users]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const errors = collectFieldErrors(customer, pickup, dropoff, scheduledPickupAt);
    if (hasFieldErrors(errors)) {
      setFieldErrors(errors);
      toast.error("Complete the highlighted fields before creating the booking.");
      return;
    }

    if (!isValidCustomer(customer) || !isValidAddressSelection(pickup) || !isValidAddressSelection(dropoff) || !isValidScheduledPickup(scheduledPickupAt)) {
      return;
    }

    const driverID =
      assignedChauffeur === UNASSIGNED_CHAUFFEUR ? null : assignedChauffeur;
    const assignedVehicle = driverID ? vehicleForChauffeur(vehicles, driverID) : undefined;
    if (driverID && !assignedVehicle) {
      toast.error(
        "This chauffeur has no fleet vehicle assigned. Assign a vehicle in Fleet first, or leave unassigned."
      );
      return;
    }
    const bookingAddons = pricingAddons.filter((addon) => selectedAddonIds.includes(addon.id));

    const trip: Trip = {
      id: crypto.randomUUID(),
      status: "requested",
      customerID: customer.id,
      customerDisplayName: customerDisplayName(customer) || null,
      customerPhoneNumber: customer.profile.phoneNumber ?? null,
      customerEmail: customer.email || null,
      driverID,
      fleetVehicleDocumentId: assignedVehicle?.driverID ?? null,
      vehicleSnapshot: assignedVehicle ?? null,
      pickup: pickup.coordinate,
      dropoff: dropoff.coordinate,
      pickupAddressLine: pickup.addressLine,
      dropoffAddressLine: dropoff.addressLine,
      notes: notes.trim() || null,
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
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not create the booking.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const isRebook = Boolean(sourceTrip);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isRebook ? "Rebook" : "New booking"}</SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <CustomerAutocomplete
                id="customer"
                value={customer}
                onChange={(value) => {
                  setCustomer(value);
                  clearFieldError("customer");
                }}
                placeholder="Search customers…"
                invalid={fieldErrors.customer}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledPickupAt">Pickup time</Label>
              <DateTimePicker
                id="scheduledPickupAt"
                value={scheduledPickupAt}
                onChange={(value) => {
                  setScheduledPickupAt(value);
                  clearFieldError("scheduledPickupAt");
                }}
                placeholder="Pick pickup time"
                disabled={saving}
                invalid={fieldErrors.scheduledPickupAt}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddressLine">Pickup address</Label>
            <AddressAutocomplete
              id="pickupAddressLine"
              value={pickup}
              onChange={(value) => {
                setPickup(value);
                clearFieldError("pickup");
              }}
              placeholder="Search pickup address…"
              invalid={fieldErrors.pickup}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropoffAddressLine">Drop-off address</Label>
            <AddressAutocomplete
              id="dropoffAddressLine"
              value={dropoff}
              onChange={(value) => {
                setDropoff(value);
                clearFieldError("dropoff");
              }}
              placeholder="Search drop-off address…"
              invalid={fieldErrors.dropoff}
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
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <SheetFooter className="grid grid-cols-2 gap-3 px-0">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="w-full">
                Cancel
              </Button>
            </SheetClose>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Creating…" : "Create booking"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
