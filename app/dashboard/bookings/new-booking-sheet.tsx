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
  countCustomerPromoRedemptions,
  createRoundTripBookings,
  createTrip,
  fetchPromotionByCode,
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
  type User,
  BOOKING_TRIP_MODES,
  bookingTripModeTitle,
  quoteTripTypeForBookingMode,
  type BookingTripMode
} from "@/lib/models";
import type { QuotePromoApplication, QuoteRequest, QuoteResult } from "@/lib/models/quote";
import { resolvePromoApplication } from "@/lib/pricing/apply-promo";
import { buildQuoteForRequest } from "@/lib/pricing/build-quote";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { customerDisplayName } from "@/lib/users/customer-display";
import { customerAddressSnapshotFromProfile } from "@/lib/models/postal-address";
import { getActiveBranchId } from "@/lib/branch/active-branch-store";
import { useLoyaltyPromosEnabled } from "@/hooks/use-loyalty-promos";
import { DateTimePicker } from "@/components/datetime-picker";
import { NumberStepper } from "@/components/number-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const DEFAULT_BOOKING_MODE: BookingTripMode = "point_to_point";

type RequiredField =
  | "customer"
  | "scheduledPickupAt"
  | "scheduledReturnAt"
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
    addonIds: [...request.addonIds].sort(),
    appliedPromoId: request.appliedPromo?.id ?? null
  });
}

function roundTripQuoteFingerprint(outbound: QuoteRequest, returnLeg: QuoteRequest): string {
  return JSON.stringify({
    outbound: quoteInputFingerprint(outbound),
    returnLeg: quoteInputFingerprint(returnLeg)
  });
}

function buildQuoteRequestInput(
  tripType: TripType,
  vehicleClassId: string,
  pickup: AddressSuggestion,
  dropoff: AddressSuggestion,
  scheduledPickupAt: Date,
  selectedAddonIds: string[],
  bookedHours: number | null,
  appliedPromo: QuotePromoApplication | null = null
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
    bookedHours,
    addonIds: selectedAddonIds,
    appliedPromo
  };
}

function quoteFieldsFromResult(
  quote: QuoteResult,
  tripType: TripType,
  vehicleClassId: string,
  vehicleClassDisplayName: string,
  bookedHours: number | null
) {
  return {
    tripType,
    vehicleClassId,
    vehicleClassDisplayName,
    bookedHours,
    quotedSubtotal: quote.subtotal,
    quotedTaxAmount: quote.taxAmount,
    quotedTotal: quote.total,
    quotedCurrencyCode: quote.currencyCode,
    quotedTaxRate: quote.quotedTaxRate,
    quotedPricesIncludeTax: quote.quotedPricesIncludeTax,
    quoteBreakdown: quote.breakdown,
    quoteComputedAt: new Date(),
    quoteSnapshot: quote.snapshot,
    appliedPromoId: quote.snapshot.appliedPromoId,
    promoCode: quote.snapshot.promoCode
  };
}

function preTaxAmountFromQuote(quote: QuoteResult): number {
  return quote.breakdown
    .filter((line) => line.category !== "tax" && line.category !== "discount")
    .reduce((sum, line) => sum + line.amount, 0);
}

function buildTripCustomerFields(customer: User) {
  return {
    customerID: customer.id,
    customerDisplayName: customerDisplayName(customer) || null,
    customerPhoneNumber: customer.profile.phoneNumber ?? null,
    customerEmail: customer.email || null,
    ...customerAddressSnapshotFromProfile(customer.profile)
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
  scheduledReturnAt: Date | null,
  vehicleClassId: string | null,
  bookingMode: BookingTripMode
): FieldErrors {
  return {
    customer: !isValidCustomer(customer),
    scheduledPickupAt: !isValidScheduledPickup(scheduledPickupAt),
    scheduledReturnAt:
      bookingMode === "round_trip" ? !isValidScheduledPickup(scheduledReturnAt) : false,
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
    setScheduledReturnAt: (date: Date | null) => void;
    setBookingMode: (mode: BookingTripMode) => void;
    setBookedHours: (hours: number) => void;
    setNotes: (notes: string) => void;
    setVehicleClassId: (id: string | null) => void;
    setQuotedTotal: (total: number | null) => void;
    setAppliedPromo: (promo: QuotePromoApplication | null) => void;
    setPromoCodeInput: (code: string) => void;
    setPromoError: (error: string | null) => void;
    setPromoExpanded: (expanded: boolean) => void;
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
  setters.setScheduledReturnAt(null);
  setters.setBookingMode(DEFAULT_BOOKING_MODE);
  setters.setBookedHours(2);
  setters.setNotes("");
  setters.setVehicleClassId(null);
  setters.setQuotedTotal(null);
  setters.setAppliedPromo(null);
  setters.setPromoCodeInput("");
  setters.setPromoError(null);
  setters.setPromoExpanded(false);
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
  const { enabled: loyaltyPromosEnabled } = useLoyaltyPromosEnabled();
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
  const [scheduledReturnAt, setScheduledReturnAt] = useState<Date | null>(null);
  const [bookingMode, setBookingMode] = useState<BookingTripMode>(DEFAULT_BOOKING_MODE);
  const [bookedHours, setBookedHours] = useState(2);
  const [notes, setNotes] = useState("");
  const [vehicleClassId, setVehicleClassId] = useState<string | null>(null);
  const [quotedTotal, setQuotedTotal] = useState<number | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<QuotePromoApplication | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoExpanded, setPromoExpanded] = useState(false);
  const [applyingPromo, setApplyingPromo] = useState(false);
  const lastQuoteRef = useRef<
    { fingerprint: string; quote: QuoteResult } | { fingerprint: string; outbound: QuoteResult; returnLeg: QuoteResult }
  | null>(null);
  const wasOpenRef = useRef(false);

  const isEdit = Boolean(editTrip);
  const quoteTripType: TripType = isEdit
    ? editTrip?.tripType === "hourly"
      ? "hourly"
      : "transfer"
    : quoteTripTypeForBookingMode(bookingMode);

  const pricingAddons = useMemo(
    () =>
      pricingConfig?.addons.filter(
        (addon) => addon.isEnabled && addon.tripTypes.includes(quoteTripType)
      ) ?? [],
    [pricingConfig, quoteTripType]
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
      tripType: quoteTripType,
      passengers: passengerCount,
      smallLuggage: smallLuggageCount,
      largeLuggage: largeLuggageCount
    }),
    [quoteTripType, passengerCount, smallLuggageCount, largeLuggageCount]
  );

  const eligibleVehiclesInClass = useMemo(() => {
    const eligible = filterEligibleFleetVehicles(vehicles, classesById, bookingRequirements, "admin", {
      requireChauffeur: false
    });
    if (!vehicleClassId) return eligible;
    return eligible.filter((vehicle) => vehicle.vehicleClassId === vehicleClassId);
  }, [vehicles, classesById, bookingRequirements, vehicleClassId]);

  const selectedVehicleClass = vehicleClassId ? classesById.get(vehicleClassId) : undefined;

  async function applyPromoCode() {
    if (!loyaltyPromosEnabled) return;
    const code = promoCodeInput.trim();
    if (!code) {
      setPromoError("Enter a promo code.");
      return;
    }
    if (!isValidCustomer(customer)) {
      setPromoError("Select a customer before applying a promo.");
      return;
    }
    if (
      !pricingConfig ||
      !operatorLocale ||
      !isValidAddressSelection(pickup) ||
      !isValidAddressSelection(dropoff) ||
      !isValidScheduledPickup(scheduledPickupAt) ||
      !vehicleClassId ||
      !selectedVehicleClass
    ) {
      setPromoError("Complete trip details before applying a promo.");
      return;
    }

    setApplyingPromo(true);
    setPromoError(null);
    try {
      const promo = await fetchPromotionByCode(code);
      if (!promo) {
        setPromoError("Promo code not found.");
        return;
      }

      const baseRequest = buildQuoteRequestInput(
        quoteTripType,
        vehicleClassId,
        pickup,
        dropoff,
        scheduledPickupAt,
        selectedAddonIds,
        quoteTripType === "hourly" ? bookedHours : null,
        null
      );
      const baseQuote = await buildQuoteForRequest(
        baseRequest,
        pricingConfig,
        operatorLocale,
        locations,
        selectedVehicleClass
      );
      const customerUses = await countCustomerPromoRedemptions(customer.id, promo.id);
      const resolved = resolvePromoApplication(promo, {
        branchId: getActiveBranchId(),
        tripType: quoteTripType,
        vehicleClassId,
        at: scheduledPickupAt,
        subtotalBeforeDiscount: preTaxAmountFromQuote(baseQuote),
        globalRedemptionCount: promo.redemptionCount,
        customerRedemptionCount: customerUses
      });
      if (!resolved.ok) {
        setPromoError(resolved.reason);
        setAppliedPromo(null);
        return;
      }
      setAppliedPromo(resolved.promo);
      setPromoCodeInput(resolved.promo.code);
      toast.success(`Promo ${resolved.promo.code} applied.`);
    } catch (err) {
      setPromoError(err instanceof Error ? err.message : "Could not apply promo.");
      setAppliedPromo(null);
    } finally {
      setApplyingPromo(false);
    }
  }

  function clearPromo() {
    setAppliedPromo(null);
    setPromoCodeInput("");
    setPromoError(null);
  }

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
        setScheduledReturnAt,
        setBookingMode,
        setBookedHours,
        setNotes,
        setVehicleClassId,
        setQuotedTotal,
        setAppliedPromo,
        setPromoCodeInput,
        setPromoError,
        setPromoExpanded
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
      setBookedHours(trip.bookedHours ?? 2);
      setNotes(trip.notes ?? "");
      setVehicleClassId(trip.vehicleClassId ?? trip.vehicleSnapshot?.vehicleClassId ?? null);
      setQuotedTotal(trip.quotedTotal ?? null);
      setPromoError(null);
      const existingCode = trip.promoCode?.trim() ?? "";
      if (existingCode) {
        setPromoCodeInput(existingCode);
        setPromoExpanded(true);
        void fetchPromotionByCode(existingCode).then((promo) => {
          if (!promo) {
            setAppliedPromo(null);
            return;
          }
          setAppliedPromo({
            id: promo.id,
            title: promo.title,
            code: promo.code,
            type: promo.type,
            value: promo.value
          });
        });
      } else {
        setAppliedPromo(null);
        setPromoCodeInput("");
        setPromoExpanded(false);
      }
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
        setScheduledReturnAt,
        setBookingMode,
        setBookedHours,
        setNotes,
        setVehicleClassId,
        setQuotedTotal,
        setAppliedPromo,
        setPromoCodeInput,
        setPromoError,
        setPromoExpanded
      });
    }
  }, [open, editTrip, sourceTrip, users]);

  useEffect(() => {
    const hourlyBookedHours = isEdit ? (editTrip?.bookedHours ?? bookedHours) : bookedHours;
    const isRoundTrip = !isEdit && bookingMode === "round_trip";
    const needsReturnTime = isRoundTrip && !isValidScheduledPickup(scheduledReturnAt);
    const needsHourlyHours =
      quoteTripType === "hourly" && (!hourlyBookedHours || hourlyBookedHours <= 0);

    if (
      !open ||
      !pricingConfig ||
      !operatorLocale ||
      !isValidAddressSelection(pickup) ||
      !isValidAddressSelection(dropoff) ||
      !isValidScheduledPickup(scheduledPickupAt) ||
      !vehicleClassId ||
      !selectedVehicleClass ||
      needsReturnTime ||
      needsHourlyHours
    ) {
      setQuotedTotal(null);
      lastQuoteRef.current = null;
      return;
    }

    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const runQuote = async () => {
      setQuoting(true);
      try {
        if (isRoundTrip) {
          const outboundRequest = buildQuoteRequestInput(
            "transfer",
            vehicleClassId,
            pickup,
            dropoff,
            scheduledPickupAt,
            selectedAddonIds,
            null,
            appliedPromo
          );
          const returnRequest = buildQuoteRequestInput(
            "transfer",
            vehicleClassId,
            dropoff,
            pickup,
            scheduledReturnAt!,
            selectedAddonIds,
            null,
            appliedPromo
          );
          const fingerprint = roundTripQuoteFingerprint(outboundRequest, returnRequest);
          const cached = lastQuoteRef.current;
          if (
            cached &&
            "outbound" in cached &&
            cached.fingerprint === fingerprint
          ) {
            if (!cancelled) {
              setQuotedTotal(cached.outbound.displayTotal + cached.returnLeg.displayTotal);
            }
            return;
          }

          const [outboundQuote, returnQuote] = await Promise.all([
            buildQuoteForRequest(
              outboundRequest,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass
            ),
            buildQuoteForRequest(
              returnRequest,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass
            )
          ]);
          if (cancelled) return;
          lastQuoteRef.current = { fingerprint, outbound: outboundQuote, returnLeg: returnQuote };
          setQuotedTotal(outboundQuote.displayTotal + returnQuote.displayTotal);
          return;
        }

        const request = buildQuoteRequestInput(
          quoteTripType,
          vehicleClassId,
          pickup,
          dropoff,
          scheduledPickupAt,
          selectedAddonIds,
          quoteTripType === "hourly" ? hourlyBookedHours : null,
          appliedPromo
        );
        const fingerprint = quoteInputFingerprint(request);
        const cached = lastQuoteRef.current;
        if (cached && "quote" in cached && cached.fingerprint === fingerprint) {
          if (!cancelled) setQuotedTotal(cached.quote.displayTotal);
          return;
        }

        const quote = await buildQuoteForRequest(
          request,
          pricingConfig,
          operatorLocale,
          locations,
          selectedVehicleClass
        );
        if (cancelled) return;
        lastQuoteRef.current = { fingerprint, quote };
        setQuotedTotal(quote.displayTotal);
      } catch {
        if (!cancelled) {
          lastQuoteRef.current = null;
          setQuotedTotal(null);
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    };

    debounceTimer = setTimeout(() => {
      void runQuote();
    }, QUOTE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [
    open,
    isEdit,
    editTrip,
    bookingMode,
    quoteTripType,
    pricingConfig,
    operatorLocale,
    locations,
    pickup,
    dropoff,
    scheduledPickupAt,
    scheduledReturnAt,
    bookedHours,
    vehicleClassId,
    selectedVehicleClass,
    selectedAddonIds,
    appliedPromo
  ]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const isEditMode = Boolean(editTrip);

    const errors = collectFieldErrors(
      customer,
      pickup,
      dropoff,
      scheduledPickupAt,
      scheduledReturnAt,
      vehicleClassId,
      isEditMode ? "point_to_point" : bookingMode
    );
    if (hasFieldErrors(errors)) {
      setFieldErrors(errors);
      toast.error(
        isEditMode
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

    if (!isEditMode && bookingMode === "round_trip") {
      if (!isValidScheduledPickup(scheduledReturnAt)) {
        setFieldErrors((prev) => ({ ...prev, scheduledReturnAt: true }));
        toast.error("Enter a return pickup time.");
        return;
      }
      if (scheduledReturnAt.getTime() <= scheduledPickupAt.getTime()) {
        setFieldErrors((prev) => ({ ...prev, scheduledReturnAt: true }));
        toast.error("Return pickup time must be after the outbound pickup time.");
        return;
      }
    }

    if (!isEditMode && bookingMode === "hourly" && bookedHours <= 0) {
      toast.error("Booked hours must be greater than zero.");
      return;
    }

    const editBookedHours = editTrip?.bookedHours ?? bookedHours;
    const submitTripType = isEditMode ? quoteTripType : quoteTripTypeForBookingMode(bookingMode);
    const submitBookedHours = submitTripType === "hourly" ? (isEditMode ? editBookedHours : bookedHours) : null;

    const bookingAddons = pricingAddons.filter((addon) => selectedAddonIds.includes(addon.id));
    const sharedBookingFields = {
      notes: notes.trim() || null,
      bookingPassengerCount: passengerCount,
      bookingSmallLuggageCount: smallLuggageCount,
      bookingLargeLuggageCount: largeLuggageCount,
      bookingAddons: bookingAddons.length ? bookingAddons : null
    };

    setSaving(true);
    try {
      if (!isEditMode && bookingMode === "round_trip") {
        const outboundRequest = buildQuoteRequestInput(
          "transfer",
          vehicleClassId,
          pickup,
          dropoff,
          scheduledPickupAt,
          selectedAddonIds,
          null,
          appliedPromo
        );
        const returnRequest = buildQuoteRequestInput(
          "transfer",
          vehicleClassId,
          dropoff,
          pickup,
          scheduledReturnAt!,
          selectedAddonIds,
          null,
          appliedPromo
        );
        const fingerprint = roundTripQuoteFingerprint(outboundRequest, returnRequest);
        const cached = lastQuoteRef.current;
        let outboundQuote: QuoteResult;
        let returnQuote: QuoteResult;
        if (cached && "outbound" in cached && cached.fingerprint === fingerprint) {
          outboundQuote = cached.outbound;
          returnQuote = cached.returnLeg;
        } else {
          [outboundQuote, returnQuote] = await Promise.all([
            buildQuoteForRequest(
              outboundRequest,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass
            ),
            buildQuoteForRequest(
              returnRequest,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass
            )
          ]);
        }

        const outboundId = crypto.randomUUID();
        const returnId = crypto.randomUUID();
        const now = new Date();
        const customerFields = buildTripCustomerFields(customer);

        const outbound: Trip = {
          id: outboundId,
          status: "requested",
          ...customerFields,
          driverID: null,
          vehicleDocumentId: null,
          vehicleSnapshot: null,
          pickup: pickup.coordinate,
          dropoff: dropoff.coordinate,
          pickupAddressLine: pickup.addressLine,
          dropoffAddressLine: dropoff.addressLine,
          scheduledPickupAt,
          linkedTripID: returnId,
          ...sharedBookingFields,
          ...quoteFieldsFromResult(
            outboundQuote,
            "transfer",
            vehicleClassId,
            selectedVehicleClass.displayName,
            null
          ),
          createdAt: now,
          updatedAt: now
        };

        const returnLeg: Trip = {
          id: returnId,
          status: "requested",
          ...customerFields,
          driverID: null,
          vehicleDocumentId: null,
          vehicleSnapshot: null,
          pickup: dropoff.coordinate,
          dropoff: pickup.coordinate,
          pickupAddressLine: dropoff.addressLine,
          dropoffAddressLine: pickup.addressLine,
          scheduledPickupAt: scheduledReturnAt!,
          linkedTripID: outboundId,
          ...sharedBookingFields,
          ...quoteFieldsFromResult(
            returnQuote,
            "transfer",
            vehicleClassId,
            selectedVehicleClass.displayName,
            null
          ),
          createdAt: now,
          updatedAt: now
        };

        await createRoundTripBookings(outbound, returnLeg);
        toast.success("Round trip created — 2 bookings.");
        onOpenChange(false);
        return;
      }

      const request = buildQuoteRequestInput(
        submitTripType,
        vehicleClassId,
        pickup,
        dropoff,
        scheduledPickupAt,
        selectedAddonIds,
        submitBookedHours,
        appliedPromo
      );
      const fingerprint = quoteInputFingerprint(request);
      const cached = lastQuoteRef.current;
      const quote =
        cached && "quote" in cached && cached.fingerprint === fingerprint
          ? cached.quote
          : await buildQuoteForRequest(
              request,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass
            );

      const quoteFields = quoteFieldsFromResult(
        quote,
        submitTripType,
        vehicleClassId,
        selectedVehicleClass.displayName,
        submitBookedHours
      );

      if (isEditMode) {
        await updateTrip(editTrip!.id, {
          ...buildTripCustomerFields(customer),
          driverID: editTrip!.driverID ?? null,
          vehicleDocumentId: editTrip!.vehicleDocumentId ?? null,
          vehicleSnapshot: editTrip!.vehicleSnapshot ?? null,
          pickup: pickup.coordinate,
          dropoff: dropoff.coordinate,
          pickupAddressLine: pickup.addressLine,
          dropoffAddressLine: dropoff.addressLine,
          scheduledPickupAt,
          ...sharedBookingFields,
          ...quoteFields
        });
        toast.success("Booking updated.");
      } else {
        const trip: Trip = {
          id: crypto.randomUUID(),
          status: "requested",
          ...buildTripCustomerFields(customer),
          driverID: null,
          vehicleDocumentId: null,
          vehicleSnapshot: null,
          pickup: pickup.coordinate,
          dropoff: dropoff.coordinate,
          pickupAddressLine: pickup.addressLine,
          dropoffAddressLine: dropoff.addressLine,
          scheduledPickupAt,
          ...sharedBookingFields,
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
          : isEditMode
            ? "Could not update the booking."
            : "Could not create the booking.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

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
          {!isEdit ? (
            <div className="space-y-2">
              <Label htmlFor="bookingMode">Trip type</Label>
              <Select
                value={bookingMode}
                onValueChange={(value) => {
                  setBookingMode(value as BookingTripMode);
                  setFieldErrors((prev) => ({
                    ...prev,
                    scheduledReturnAt: false
                  }));
                }}
                disabled={saving}>
                <SelectTrigger id="bookingMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_TRIP_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {bookingTripModeTitle[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

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
              <Label htmlFor="scheduledPickupAt">
                {bookingMode === "round_trip" && !isEdit ? "Outbound pickup time" : "Pickup time"}
              </Label>
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

          {!isEdit && bookingMode === "round_trip" ? (
            <div className="space-y-2">
              <Label htmlFor="scheduledReturnAt">Return pickup time</Label>
              <DateTimePicker
                id="scheduledReturnAt"
                value={scheduledReturnAt}
                onChange={(value) => {
                  setScheduledReturnAt(value);
                  clearFieldError("scheduledReturnAt");
                }}
                placeholder="Pick return pickup time"
                disabled={saving}
                invalid={fieldErrors.scheduledReturnAt}
              />
            </div>
          ) : null}

          {!isEdit && bookingMode === "hourly" ? (
            <NumberStepper
              id="bookedHours"
              label="Booked hours"
              value={bookedHours}
              onChange={setBookedHours}
              min={1}
              max={24}
              disabled={saving}
            />
          ) : null}

          {isEdit && editTrip?.tripType === "hourly" ? (
            <NumberStepper
              id="bookedHours"
              label="Booked hours"
              value={bookedHours}
              onChange={setBookedHours}
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
                  className={cn("w-full", fieldErrors.vehicleClassId && "border-destructive")}>
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

          {loyaltyPromosEnabled ? (
            <div className="space-y-2">
              <Label>Promo code</Label>
              {appliedPromo ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {appliedPromo.code}
                  </Badge>
                  <span className="text-muted-foreground text-sm truncate">{appliedPromo.title}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    disabled={saving}
                    onClick={clearPromo}>
                    Remove
                  </Button>
                </div>
              ) : promoExpanded ? (
                <div className="flex gap-2">
                  <Input
                    id="bookingPromoCode"
                    value={promoCodeInput}
                    onChange={(e) => {
                      setPromoCodeInput(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    placeholder="Enter code"
                    className="font-mono uppercase"
                    disabled={saving || applyingPromo}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving || applyingPromo}
                    onClick={() => void applyPromoCode()}>
                    {applyingPromo ? "…" : "Apply"}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0"
                  disabled={saving}
                  onClick={() => setPromoExpanded(true)}>
                  Add promo code
                </Button>
              )}
              {promoError ? <p className="text-destructive text-sm">{promoError}</p> : null}
            </div>
          ) : null}

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
