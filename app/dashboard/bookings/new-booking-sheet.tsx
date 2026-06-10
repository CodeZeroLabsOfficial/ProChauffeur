"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { MultiSelectField } from "@/components/multi-select-field";
import { useFleetLocations, useUsers, useVehicleClasses, useVehicles } from "@/hooks/use-collections";
import {
  filterEligibleFleetVehicles,
  vehicleClassesById
} from "@/lib/bookings/booking-eligibility";
import {
  createTrip,
  updateTrip
} from "@/lib/services/firebase-service";
import {
  getCachedOperatorLocale,
  getCachedPricingConfiguration
} from "@/lib/services/operator-config-cache";
import { hasValidCoordinate } from "@/lib/mapbox/coordinates";
import {
  tripPickupReferenceDate,
  type CoordinateField,
  type OperatorLocale,
  type PricingAddon,
  type PricingConfig,
  type Trip,
  type TripType,
  type User
} from "@/lib/models";
import type { QuoteRequest, QuoteResult } from "@/lib/models/quote";
import { buildQuoteForRequest } from "@/lib/pricing/build-quote";
import { formatCurrency } from "@/lib/format";
import { customerDisplayName } from "@/lib/users/customer-display";
import { customerAddressSnapshotFromProfile } from "@/lib/models/postal-address";
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
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";

const DEFAULT_TRIP_TYPE: TripType = "transfer";

type RequiredField =
  | "customer"
  | "scheduledPickupAt"
  | "pickup"
  | "dropoff"
  | "vehicleClassId";

type FieldErrors = Partial<Record<RequiredField, boolean>>;

const QUOTE_DEBOUNCE_MS = 400;

function quoteInputFingerprint(request: QuoteRequest): string {
  return JSON.stringify({
    tripType: request.tripType,
    vehicleClassId: request.vehicleClassId,
    pickup: request.pickup,
    dropoff: request.dropoff,
    pickupPostcode: request.pickupPostcode,
    dropoffPostcode: request.dropoffPostcode,
    scheduledPickupAt: request.scheduledPickupAt.toISOString(),
    bookedHours: request.bookedHours,
    addonIds: [...request.addonIds].sort()
  });
}

function buildQuoteRequestInput(
  vehicleClassId: string,
  pickup: AddressSuggestion,
  dropoff: AddressSuggestion,
  scheduledPickupAt: Date,
  selectedAddonIds: string[]
): QuoteRequest {
  return {
    tripType: DEFAULT_TRIP_TYPE,
    vehicleClassId,
    pickup: pickup.coordinate,
    dropoff: dropoff.coordinate,
    pickupAddressLine: pickup.addressLine,
    dropoffAddressLine: dropoff.addressLine,
    pickupPostcode: postcodeFromAddress(pickup),
    dropoffPostcode: postcodeFromAddress(dropoff),
    scheduledPickupAt,
    bookedHours: null,
    addonIds: selectedAddonIds
  };
}

function addonLabel(addon: PricingAddon, currency: string) {
  return `${addon.title} (${formatCurrency(addon.price, currency)})`;
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

function postcodeFromAddress(selection: AddressSuggestion | null): string {
  return selection?.postalAddress?.postcode?.trim() ?? "";
}

function collectFieldErrors(
  customer: User | null,
  pickup: AddressSuggestion | null,
  dropoff: AddressSuggestion | null,
  scheduledPickupAt: Date | null,
  vehicleClassId: string | null
): FieldErrors {
  return {
    customer: !isValidCustomer(customer),
    scheduledPickupAt: !isValidScheduledPickup(scheduledPickupAt),
    pickup: !isValidAddressSelection(pickup),
    dropoff: !isValidAddressSelection(dropoff),
    vehicleClassId: !vehicleClassId
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
    setSelectedAddonIds: (ids: string[]) => void;
    setPassengerCount: (count: number) => void;
    setSmallLuggageCount: (count: number) => void;
    setLargeLuggageCount: (count: number) => void;
    setScheduledPickupAt: (date: Date | null) => void;
    setNotes: (notes: string) => void;
    setVehicleClassId: (id: string | null) => void;
    setQuotedTotal: (total: number | null) => void;
  }
) {
  setters.setFieldErrors({});
  setters.setCustomer(null);
  setters.setPickup(null);
  setters.setDropoff(null);
  setters.setSelectedAddonIds([]);
  setters.setPassengerCount(1);
  setters.setSmallLuggageCount(0);
  setters.setLargeLuggageCount(0);
  setters.setScheduledPickupAt(null);
  setters.setNotes("");
  setters.setVehicleClassId(null);
  setters.setQuotedTotal(null);
}

export function NewBookingSheet({
  trigger,
  open,
  onOpenChange,
  sourceTrip = null,
  editTrip = null
}: {
  trigger?: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceTrip?: Trip | null;
  editTrip?: Trip | null;
}) {
  const { users } = useUsers();
  const { vehicles } = useVehicles();
  const { locations } = useFleetLocations();
  const { vehicleClasses } = useVehicleClasses();
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [customer, setCustomer] = useState<User | null>(null);
  const [pickup, setPickup] = useState<AddressSuggestion | null>(null);
  const [dropoff, setDropoff] = useState<AddressSuggestion | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [operatorLocale, setOperatorLocale] = useState<OperatorLocale | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [smallLuggageCount, setSmallLuggageCount] = useState(0);
  const [largeLuggageCount, setLargeLuggageCount] = useState(0);
  const [scheduledPickupAt, setScheduledPickupAt] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [vehicleClassId, setVehicleClassId] = useState<string | null>(null);
  const [quotedTotal, setQuotedTotal] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const lastQuoteRef = useRef<{ fingerprint: string; quote: QuoteResult } | null>(null);
  const wasOpenRef = useRef(false);

  const pricingAddons = useMemo(
    () => pricingConfig?.addons.filter((addon) => addon.isEnabled) ?? [],
    [pricingConfig]
  );
  const currency = operatorLocale?.currency ?? "AUD";

  const addonOptions = useMemo(
    () =>
      pricingAddons.map((addon) => ({
        value: addon.id,
        label: addonLabel(addon, currency)
      })),
    [pricingAddons, currency]
  );

  function clearFieldError(field: RequiredField) {
    setFieldErrors((prev) => ({ ...prev, [field]: false }));
  }

  const classesById = useMemo(() => vehicleClassesById(vehicleClasses), [vehicleClasses]);

  const bookingRequirements = useMemo(
    () => ({
      tripType: DEFAULT_TRIP_TYPE,
      passengers: passengerCount,
      smallLuggage: smallLuggageCount,
      largeLuggage: largeLuggageCount
    }),
    [passengerCount, smallLuggageCount, largeLuggageCount]
  );

  const eligibleVehiclesInClass = useMemo(() => {
    const eligible = filterEligibleFleetVehicles(vehicles, classesById, bookingRequirements, "admin", {
      requireChauffeur: false
    });
    if (!vehicleClassId) return eligible;
    return eligible.filter((vehicle) => vehicle.vehicleClassId === vehicleClassId);
  }, [vehicles, classesById, bookingRequirements, vehicleClassId]);

  const selectedVehicleClass = vehicleClassId ? classesById.get(vehicleClassId) : undefined;

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      lastQuoteRef.current = null;
      resetFormFields({
        setFieldErrors,
        setCustomer,
        setPickup,
        setDropoff,
        setSelectedAddonIds,
        setPassengerCount,
        setSmallLuggageCount,
        setLargeLuggageCount,
        setScheduledPickupAt,
        setNotes,
        setVehicleClassId,
        setQuotedTotal
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    Promise.all([getCachedPricingConfiguration(), getCachedOperatorLocale()])
      .then(([pricing, locale]) => {
        setPricingConfig(pricing);
        setOperatorLocale(locale);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Pricing is not configured.");
      });
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;

    if (editTrip || sourceTrip) {
      const trip = editTrip ?? sourceTrip!;
      const matchedCustomer =
        users.find((u) => u.id === trip.customerID && u.role === "customer") ?? null;
      if (!matchedCustomer) {
        toast.warning("Customer no longer found — select a customer.");
      }

      setFieldErrors({});
      setCustomer(matchedCustomer);
      setPickup(addressFromTrip(trip.pickupAddressLine, trip.pickup));
      setDropoff(addressFromTrip(trip.dropoffAddressLine, trip.dropoff));
      setSelectedAddonIds(trip.bookingAddons?.map((addon) => addon.id) ?? []);
      setPassengerCount(trip.bookingPassengerCount ?? 1);
      setSmallLuggageCount(trip.bookingSmallLuggageCount ?? 0);
      setLargeLuggageCount(trip.bookingLargeLuggageCount ?? 0);
      setScheduledPickupAt(
        editTrip ? (trip.scheduledPickupAt ?? tripPickupReferenceDate(trip)) : null
      );
      setNotes(trip.notes ?? "");
      setVehicleClassId(trip.vehicleClassId ?? trip.vehicleSnapshot?.vehicleClassId ?? null);
      setQuotedTotal(trip.quotedTotal ?? null);
      return;
    }

    if (justOpened) {
      resetFormFields({
        setFieldErrors,
        setCustomer,
        setPickup,
        setDropoff,
        setSelectedAddonIds,
        setPassengerCount,
        setSmallLuggageCount,
        setLargeLuggageCount,
        setScheduledPickupAt,
        setNotes,
        setVehicleClassId,
        setQuotedTotal
      });
    }
  }, [open, editTrip, sourceTrip, users]);

  useEffect(() => {
    if (
      !open ||
      !pricingConfig ||
      !operatorLocale ||
      !isValidAddressSelection(pickup) ||
      !isValidAddressSelection(dropoff) ||
      !isValidScheduledPickup(scheduledPickupAt) ||
      !vehicleClassId ||
      !selectedVehicleClass
    ) {
      setQuotedTotal(null);
      lastQuoteRef.current = null;
      return;
    }

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const runQuote = () => {
      setQuoting(true);
      const request = buildQuoteRequestInput(
        vehicleClassId,
        pickup,
        dropoff,
        scheduledPickupAt,
        selectedAddonIds
      );
      const fingerprint = quoteInputFingerprint(request);

      buildQuoteForRequest(
        request,
        pricingConfig,
        operatorLocale,
        locations,
        selectedVehicleClass
      )
        .then((quote) => {
          if (cancelled) return;
          lastQuoteRef.current = { fingerprint, quote };
          setQuotedTotal(quote.displayTotal);
        })
        .catch(() => {
          if (!cancelled) {
            lastQuoteRef.current = null;
            setQuotedTotal(null);
          }
        })
        .finally(() => {
          if (!cancelled) setQuoting(false);
        });
    };

    debounceTimer = setTimeout(runQuote, QUOTE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [
    open,
    pricingConfig,
    operatorLocale,
    locations,
    pickup,
    dropoff,
    scheduledPickupAt,
    vehicleClassId,
    selectedVehicleClass,
    selectedAddonIds
  ]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isEdit = Boolean(editTrip);

    const errors = collectFieldErrors(
      customer,
      pickup,
      dropoff,
      scheduledPickupAt,
      vehicleClassId
    );
    if (hasFieldErrors(errors)) {
      setFieldErrors(errors);
      toast.error(
        isEdit
          ? "Complete the highlighted fields before saving."
          : "Complete the highlighted fields before creating the booking."
      );
      return;
    }

    if (
      !isValidCustomer(customer) ||
      !isValidAddressSelection(pickup) ||
      !isValidAddressSelection(dropoff) ||
      !isValidScheduledPickup(scheduledPickupAt) ||
      !vehicleClassId ||
      !selectedVehicleClass ||
      !pricingConfig ||
      !operatorLocale
    ) {
      return;
    }

    const bookingAddons = pricingAddons.filter((addon) => selectedAddonIds.includes(addon.id));

    setSaving(true);
    try {
      const request = buildQuoteRequestInput(
        vehicleClassId,
        pickup,
        dropoff,
        scheduledPickupAt,
        selectedAddonIds
      );
      const fingerprint = quoteInputFingerprint(request);
      const cached = lastQuoteRef.current;
      const quote =
        cached?.fingerprint === fingerprint
          ? cached.quote
          : await buildQuoteForRequest(
              request,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass
            );

      const quoteFields = {
        tripType: DEFAULT_TRIP_TYPE,
        vehicleClassId,
        vehicleClassDisplayName: selectedVehicleClass.displayName,
        bookedHours: null,
        quotedSubtotal: quote.subtotal,
        quotedTaxAmount: quote.taxAmount,
        quotedTotal: quote.total,
        quotedCurrencyCode: quote.currencyCode,
        quotedTaxRate: quote.quotedTaxRate,
        quotedPricesIncludeTax: quote.quotedPricesIncludeTax,
        quoteBreakdown: quote.breakdown,
        quoteComputedAt: new Date(),
        quoteSnapshot: quote.snapshot
      };

      if (isEdit) {
        await updateTrip(editTrip!.id, {
          customerID: customer.id,
          customerDisplayName: customerDisplayName(customer) || null,
          customerPhoneNumber: customer.profile.phoneNumber ?? null,
          customerEmail: customer.email || null,
          ...customerAddressSnapshotFromProfile(customer.profile),
          driverID: editTrip!.driverID ?? null,
          vehicleDocumentId: editTrip!.vehicleDocumentId ?? null,
          vehicleSnapshot: editTrip!.vehicleSnapshot ?? null,
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
          ...quoteFields
        });
        toast.success("Booking updated.");
      } else {
        const trip: Trip = {
          id: crypto.randomUUID(),
          status: "requested",
          customerID: customer.id,
          customerDisplayName: customerDisplayName(customer) || null,
          customerPhoneNumber: customer.profile.phoneNumber ?? null,
          customerEmail: customer.email || null,
          ...customerAddressSnapshotFromProfile(customer.profile),
          driverID: null,
          vehicleDocumentId: null,
          vehicleSnapshot: null,
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
          ...quoteFields,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await createTrip(trip);
        toast.success("Booking created.");
      }
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isEdit
            ? "Could not update the booking."
            : "Could not create the booking.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const isEdit = Boolean(editTrip);
  const isRebook = Boolean(sourceTrip && !editTrip);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit booking" : isRebook ? "Rebook" : "New booking"}
          </SheetTitle>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4">
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
              <Label htmlFor="vehicleClassId">Service class</Label>
              <Select
                value={vehicleClassId ?? undefined}
                onValueChange={(value) => {
                  setVehicleClassId(value);
                  clearFieldError("vehicleClassId");
                }}
                disabled={saving}>
                <SelectTrigger
                  id="vehicleClassId"
                  className={fieldErrors.vehicleClassId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleClasses
                    .filter((vehicleClass) => vehicleClass.isEnabled)
                    .map((vehicleClass) => (
                      <SelectItem key={vehicleClass.id} value={vehicleClass.id}>
                        {vehicleClass.displayName}
                      </SelectItem>
                    ))}
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

          {vehicleClassId && eligibleVehiclesInClass.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              {eligibleVehiclesInClass.length} fleet vehicle
              {eligibleVehiclesInClass.length === 1 ? "" : "s"} in this class match passengers
              and luggage.
            </p>
          ) : null}

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
          </div>

          <div className="shrink-0 space-y-3 border-t px-4 pt-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={saving || quoting} className="w-full">
                {saving
                  ? isEdit
                    ? "Saving…"
                    : "Creating…"
                  : isEdit
                    ? "Save changes"
                    : "Create booking"}
              </Button>
            </div>

            {quotedTotal != null ? (
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">Estimated total: </span>
                <span className="font-medium">
                  {quoting ? "Calculating…" : formatCurrency(quotedTotal, currency)}
                </span>
              </div>
            ) : null}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
