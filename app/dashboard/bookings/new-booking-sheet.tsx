"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { MultiSelectField } from "@/components/multi-select-field";
import { vehicleForChauffeur } from "@/app/dashboard/bookings/lib/chauffeur-assignment";
import { useFleetLocations, useUsers, useVehicleClasses, useVehicles } from "@/hooks/use-collections";
import {
  filterEligibleFleetVehicles,
  vehicleClassesById
} from "@/lib/bookings/booking-eligibility";
import { validateTripAgainstVehicle } from "@/lib/bookings/validate-capacity";
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
  tripTypeTitle,
  type CoordinateField,
  type OperatorLocale,
  type PricingAddon,
  type PricingConfig,
  type Trip,
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";

const UNASSIGNED_CHAUFFEUR = "__unassigned__";
const BOOKING_TRIP_TYPES = ["transfer", "hourly"] as const;
type BookingTripType = (typeof BOOKING_TRIP_TYPES)[number];

type RequiredField =
  | "customer"
  | "scheduledPickupAt"
  | "pickup"
  | "dropoff"
  | "tripType"
  | "vehicleClassId"
  | "bookedHours";

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
  tripType: BookingTripType,
  vehicleClassId: string,
  pickup: AddressSuggestion,
  dropoff: AddressSuggestion,
  scheduledPickupAt: Date,
  bookedHours: number,
  selectedAddonIds: string[]
): QuoteRequest {
  return {
    tripType,
    vehicleClassId,
    pickup: pickup.coordinate,
    dropoff: dropoff.coordinate,
    pickupAddressLine: pickup.addressLine,
    dropoffAddressLine: dropoff.addressLine,
    pickupPostcode: postcodeFromAddress(pickup),
    dropoffPostcode: postcodeFromAddress(dropoff),
    scheduledPickupAt,
    bookedHours: tripType === "hourly" ? bookedHours : null,
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
  tripType: BookingTripType,
  vehicleClassId: string | null,
  bookedHours: number
): FieldErrors {
  return {
    customer: !isValidCustomer(customer),
    scheduledPickupAt: !isValidScheduledPickup(scheduledPickupAt),
    pickup: !isValidAddressSelection(pickup),
    dropoff: !isValidAddressSelection(dropoff),
    tripType: !BOOKING_TRIP_TYPES.includes(tripType),
    vehicleClassId: !vehicleClassId,
    bookedHours: tripType === "hourly" && bookedHours <= 0
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
    setTripType: (type: BookingTripType) => void;
    setVehicleClassId: (id: string | null) => void;
    setBookedHours: (hours: number) => void;
    setQuotedTotal: (total: number | null) => void;
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
  setters.setTripType("transfer");
  setters.setVehicleClassId(null);
  setters.setBookedHours(2);
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
  const [assignedChauffeur, setAssignedChauffeur] = useState(UNASSIGNED_CHAUFFEUR);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [operatorLocale, setOperatorLocale] = useState<OperatorLocale | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [smallLuggageCount, setSmallLuggageCount] = useState(0);
  const [largeLuggageCount, setLargeLuggageCount] = useState(0);
  const [scheduledPickupAt, setScheduledPickupAt] = useState<Date | null>(null);
  const [notes, setNotes] = useState("");
  const [tripType, setTripType] = useState<BookingTripType>("transfer");
  const [vehicleClassId, setVehicleClassId] = useState<string | null>(null);
  const [bookedHours, setBookedHours] = useState(2);
  const [quotedTotal, setQuotedTotal] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const lastQuoteRef = useRef<{ fingerprint: string; quote: QuoteResult } | null>(null);
  const wasOpenRef = useRef(false);

  const chauffeurs = useMemo(
    () =>
      users
        .filter((u) => u.role === "driver")
        .sort((a, b) =>
          (a.profile.displayName || a.email).localeCompare(b.profile.displayName || b.email)
        ),
    [users]
  );

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
      tripType,
      passengers: passengerCount,
      smallLuggage: smallLuggageCount,
      largeLuggage: largeLuggageCount
    }),
    [tripType, passengerCount, smallLuggageCount, largeLuggageCount]
  );

  const eligibleVehicles = useMemo(
    () =>
      filterEligibleFleetVehicles(vehicles, classesById, bookingRequirements, "admin", {
        requireChauffeur: false
      }),
    [vehicles, classesById, bookingRequirements]
  );

  const selectedVehicleClass = vehicleClassId ? classesById.get(vehicleClassId) : undefined;

  useEffect(() => {
    if (assignedChauffeur === UNASSIGNED_CHAUFFEUR) return;
    const vehicle = vehicleForChauffeur(vehicles, assignedChauffeur);
    if (vehicle?.vehicleClassId) {
      setVehicleClassId(vehicle.vehicleClassId);
    }
  }, [assignedChauffeur, vehicles]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      lastQuoteRef.current = null;
      resetFormFields({
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
        setNotes,
        setTripType,
        setVehicleClassId,
        setBookedHours,
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

      const chauffeurIds = new Set(users.filter((u) => u.role === "driver").map((u) => u.id));
      const chauffeur =
        trip.driverID && chauffeurIds.has(trip.driverID)
          ? trip.driverID
          : UNASSIGNED_CHAUFFEUR;

      setFieldErrors({});
      setCustomer(matchedCustomer);
      setPickup(addressFromTrip(trip.pickupAddressLine, trip.pickup));
      setDropoff(addressFromTrip(trip.dropoffAddressLine, trip.dropoff));
      setAssignedChauffeur(chauffeur);
      setSelectedAddonIds(trip.bookingAddons?.map((addon) => addon.id) ?? []);
      setPassengerCount(trip.bookingPassengerCount ?? 1);
      setSmallLuggageCount(trip.bookingSmallLuggageCount ?? 0);
      setLargeLuggageCount(trip.bookingLargeLuggageCount ?? 0);
      setScheduledPickupAt(
        editTrip ? (trip.scheduledPickupAt ?? tripPickupReferenceDate(trip)) : null
      );
      setNotes(trip.notes ?? "");
      setTripType(
        trip.tripType === "hourly" || trip.tripType === "transfer" ? trip.tripType : "transfer"
      );
      setVehicleClassId(trip.vehicleClassId ?? trip.vehicleSnapshot?.vehicleClassId ?? null);
      setBookedHours(trip.bookedHours ?? 2);
      setQuotedTotal(trip.quotedTotal ?? null);
      return;
    }

    if (justOpened) {
      resetFormFields({
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
        setNotes,
        setTripType,
        setVehicleClassId,
        setBookedHours,
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
      !selectedVehicleClass ||
      (tripType === "hourly" && bookedHours <= 0)
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
        tripType,
        vehicleClassId,
        pickup,
        dropoff,
        scheduledPickupAt,
        bookedHours,
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
    tripType,
    vehicleClassId,
    selectedVehicleClass,
    bookedHours,
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
      tripType,
      vehicleClassId,
      bookedHours
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

    const driverID =
      assignedChauffeur === UNASSIGNED_CHAUFFEUR ? null : assignedChauffeur;
    const assignedVehicle = driverID ? vehicleForChauffeur(vehicles, driverID) : undefined;
    if (driverID && !assignedVehicle) {
      toast.error(
        "This chauffeur has no fleet vehicle assigned. Assign a vehicle in Fleet first, or leave unassigned."
      );
      return;
    }
    if (assignedVehicle) {
      const capacityIssues = validateTripAgainstVehicle(bookingRequirements, assignedVehicle);
      if (capacityIssues.length > 0) {
        toast.error(capacityIssues[0]!.message);
        return;
      }
    }
    const bookingAddons = pricingAddons.filter((addon) => selectedAddonIds.includes(addon.id));

    setSaving(true);
    try {
      const request = buildQuoteRequestInput(
        tripType,
        vehicleClassId,
        pickup,
        dropoff,
        scheduledPickupAt,
        bookedHours,
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
        tripType,
        vehicleClassId,
        vehicleClassDisplayName: selectedVehicleClass.displayName,
        bookedHours: tripType === "hourly" ? bookedHours : null,
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
          driverID,
          vehicleDocumentId: assignedVehicle?.driverID ?? null,
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
          driverID,
          vehicleDocumentId: assignedVehicle?.driverID ?? null,
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
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Edit booking" : isRebook ? "Rebook" : "New booking"}
          </SheetTitle>
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tripType">Trip type</Label>
              <Select
                value={tripType}
                onValueChange={(value) => {
                  setTripType(value as BookingTripType);
                  clearFieldError("tripType");
                }}
                disabled={saving}>
                <SelectTrigger id="tripType" className={fieldErrors.tripType ? "border-destructive" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_TRIP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {tripTypeTitle[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleClassId">Service class</Label>
              <Select
                value={vehicleClassId ?? undefined}
                onValueChange={(value) => {
                  setVehicleClassId(value);
                  clearFieldError("vehicleClassId");
                }}
                disabled={saving || assignedChauffeur !== UNASSIGNED_CHAUFFEUR}>
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
          </div>

          {eligibleVehicles.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              {eligibleVehicles.length} fleet vehicle
              {eligibleVehicles.length === 1 ? "" : "s"} match passengers and luggage.
            </p>
          ) : null}

          {tripType === "hourly" ? (
            <NumberStepper
              id="bookedHours"
              label="Booked hours"
              value={bookedHours}
              onChange={(value) => {
                setBookedHours(value);
                clearFieldError("bookedHours");
              }}
              min={1}
              max={24}
              disabled={saving}
            />
          ) : null}

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

          {quotedTotal != null ? (
            <div className="bg-muted rounded-lg px-3 py-2 text-sm">
              <span className="text-muted-foreground">Estimated total: </span>
              <span className="font-medium">
                {quoting ? "Calculating…" : formatCurrency(quotedTotal, currency)}
              </span>
            </div>
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

          <SheetFooter className="grid grid-cols-2 gap-3 px-0">
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
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
