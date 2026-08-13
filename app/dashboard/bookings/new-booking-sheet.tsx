"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AddressAutocomplete, type AddressSuggestion } from "@/components/address-autocomplete";
import { CustomerAutocomplete } from "@/components/customer-autocomplete";
import { MultiSelectField } from "@/components/multi-select-field";
import {
  useFleetLocations,
  useUsers,
  useVehicleClasses
} from "@/hooks/use-collections";
import {
  filterEligibleVehicleClasses,
  vehicleClassesById
} from "@/lib/bookings/booking-eligibility";
import { validateTripAgainstVehicleClass } from "@/lib/bookings/validate-capacity";
import {
  countCustomerPromoRedemptions,
  createRoundTripBookings,
  createTrip,
  fetchCorporateAccount,
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
  type CorporateAccount,
  type CorporateAllowedPayment,
  type OperatorLocale,
  type PricingAddon,
  type PricingConfig,
  type Trip,
  type TripBilling,
  type TripCapacity,
  type TripCustomer,
  type TripJourney,
  type TripQuote,
  type TripType,
  type User,
  BOOKING_TRIP_MODES,
  accountAllowsPayment,
  accountAllowsVehicleClass,
  bookingTripModeTitle,
  clampPreferredPayment,
  corporatePreferredPaymentTitle,
  quoteTripTypeForBookingMode,
  type BookingTripMode
} from "@/lib/models";
import type { QuotePromoApplication, QuoteRequest, QuoteResult } from "@/lib/models/quote";
import { resolvePromoApplication } from "@/lib/pricing/apply-promo";
import { buildQuoteForRequest } from "@/lib/pricing/build-quote";
import { computeQuoteRemote } from "@/lib/services/quote-service";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { customerDisplayName } from "@/lib/users/customer-display";
import { customerAddressSnapshotFromProfile } from "@/lib/models/postal-address";
import { getActiveBranchId } from "@/lib/branch/active-branch-store";
import { useFeatureEnabled } from "@/hooks/use-feature-enabled";
import { useLoyaltyPromosEnabled } from "@/hooks/use-loyalty-promos";
import { DateTimePicker } from "@/components/datetime-picker";
import { NumberStepper } from "@/components/number-stepper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  SheetFooter,
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
    appliedPromoId: request.appliedPromo?.id ?? null,
    corporateAccountId: request.corporateAccount?.id ?? null,
    corporateRateMode: request.corporateAccount?.rateMode ?? null,
    corporatePercentOff: request.corporateAccount?.percentOff ?? null,
    corporateFixedRates: request.corporateAccount?.fixedRates ?? null
  });
}

async function resolveBookingQuote(
  request: QuoteRequest,
  pricing: PricingConfig,
  locale: OperatorLocale,
  locations: Parameters<typeof buildQuoteForRequest>[3],
  vehicleClass: NonNullable<Parameters<typeof buildQuoteForRequest>[4]>,
  opts: {
    customerId: string | null;
    settlement: CorporateAllowedPayment | null;
  }
): Promise<QuoteResult> {
  if (request.corporateAccount && opts.customerId && opts.settlement) {
    return computeQuoteRemote({
      branchId: getActiveBranchId(),
      customerId: opts.customerId,
      settlement: opts.settlement,
      trip: {
        tripType: request.tripType,
        vehicleClassId: request.vehicleClassId,
        pickup: request.pickup,
        dropoff: request.dropoff,
        pickupAddressLine: request.pickupAddressLine,
        dropoffAddressLine: request.dropoffAddressLine,
        pickupPostcode: request.pickupPostcode,
        dropoffPostcode: request.dropoffPostcode,
        scheduledPickupAt: request.scheduledPickupAt,
        bookedHours: request.bookedHours,
        addonIds: request.addonIds
      }
    });
  }
  return buildQuoteForRequest(
    { ...request, corporateAccount: null },
    pricing,
    locale,
    locations,
    vehicleClass
  );
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
  appliedPromo: QuotePromoApplication | null = null,
  corporateAccount: CorporateAccount | null = null
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
    appliedPromo,
    corporateAccount
  };
}

function quoteFieldsFromResult(
  quote: QuoteResult,
  tripType: TripType,
  vehicleClassId: string,
  vehicleClassDisplayName: string,
  bookedHours: number | null
): {
  journeyFields: Pick<TripJourney, "tripType" | "bookedHours">;
  quoteFields: TripQuote;
} {
  return {
    journeyFields: { tripType, bookedHours },
    quoteFields: {
      vehicleClassId,
      vehicleClassDisplayName,
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
    }
  };
}

function preTaxAmountFromQuote(quote: QuoteResult): number {
  return quote.breakdown
    .filter((line) => line.category !== "tax" && line.category !== "discount")
    .reduce((sum, line) => sum + line.amount, 0);
}

function buildTripCustomerFields(customer: User): { customerID: string; customer: TripCustomer } {
  return {
    customerID: customer.id,
    customer: {
      displayName: customerDisplayName(customer) || null,
      phoneNumber: customer.profile.phoneNumber ?? null,
      email: customer.email || null,
      ...customerAddressSnapshotFromProfile(customer.profile)
    }
  };
}

function addonLabel(addon: PricingAddon, currency: string) {
  return `${addon.title} (${formatCurrency(addon.price, currency)})`;
}

function isValidCustomer(customer: User | null): customer is User {
  return Boolean(customer && customer.role === "customer");
}

function isValidAddressSelection(
  selection: AddressSuggestion | null
): selection is AddressSuggestion {
  return Boolean(selection?.addressLine.trim() && hasValidCoordinate(selection.coordinate));
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

function resetFormFields(setters: {
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
  setCorporateAccount: (account: CorporateAccount | null) => void;
  setCorporateSettlement: (value: CorporateAllowedPayment | null) => void;
}) {
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
  setters.setCorporateAccount(null);
  setters.setCorporateSettlement(null);
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
  const { locations } = useFleetLocations();
  const { vehicleClasses } = useVehicleClasses();
  const { enabled: loyaltyPromosEnabled } = useLoyaltyPromosEnabled();
  const { ready: corporateFeatureReady, enabled: corporateAccountsEnabled } =
    useFeatureEnabled("corporateAccounts");
  const corporateFeatureOn = corporateFeatureReady && corporateAccountsEnabled;
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [customer, setCustomer] = useState<User | null>(null);
  const [corporateAccount, setCorporateAccount] = useState<CorporateAccount | null>(null);
  /** Settlement when booking under a corporate account: on_account | card. */
  const [corporateSettlement, setCorporateSettlement] = useState<CorporateAllowedPayment | null>(
    null
  );
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
    | { fingerprint: string; quote: QuoteResult }
    | { fingerprint: string; outbound: QuoteResult; returnLeg: QuoteResult }
    | null
  >(null);
  const wasOpenRef = useRef(false);

  const isEdit = Boolean(editTrip);
  const quoteTripType: TripType = isEdit
    ? editTrip?.journey.tripType === "hourly"
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
  const currency = operatorLocale?.currency;

  const addonOptions = useMemo(
    () =>
      pricingAddons.map((addon) => ({
        value: addon.id,
        label: currency ? addonLabel(addon, currency) : addon.title
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

  const activeCorporateAccount =
    corporateFeatureOn && corporateAccount?.status === "active" ? corporateAccount : null;

  const eligibleVehicleClasses = useMemo(() => {
    return filterEligibleVehicleClasses(vehicleClasses, bookingRequirements, "admin").filter(
      (vehicleClass) => accountAllowsVehicleClass(activeCorporateAccount, vehicleClass.id)
    );
  }, [vehicleClasses, bookingRequirements, activeCorporateAccount]);

  const selectedVehicleClass = vehicleClassId ? classesById.get(vehicleClassId) : undefined;

  useEffect(() => {
    if (!vehicleClassId) return;
    if (!eligibleVehicleClasses.some((vehicleClass) => vehicleClass.id === vehicleClassId)) {
      setVehicleClassId(null);
    }
  }, [vehicleClassId, eligibleVehicleClasses]);

  const applyCorporateRates = Boolean(activeCorporateAccount && corporateSettlement);
  const corporateAccountForQuote = applyCorporateRates ? activeCorporateAccount : null;
  const billToCorporate = corporateSettlement === "on_account";
  const promoForQuote = applyCorporateRates ? null : appliedPromo;

  const lastCorporateCustomerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!customer?.corporateAccountId || !corporateFeatureOn) {
      setCorporateAccount(null);
      setCorporateSettlement(null);
      if (!customer) {
        lastCorporateCustomerIdRef.current = null;
      }
      return;
    }
    let cancelled = false;
    const accountId = customer.corporateAccountId;
    const customerChanged = lastCorporateCustomerIdRef.current !== customer.id;
    if (customerChanged) lastCorporateCustomerIdRef.current = customer.id;

    fetchCorporateAccount(accountId)
      .then((account) => {
        if (cancelled) return;
        const active = account?.status === "active" ? account : null;
        setCorporateAccount(active);
        if (!active) {
          setCorporateSettlement(null);
          return;
        }
        if (customerChanged) {
          const allowed = active.allowedPaymentMethods;
          const preferred = clampPreferredPayment(active.preferredPayment ?? null, allowed);
          if (preferred) {
            setCorporateSettlement(preferred);
          } else if (allowed.includes("on_account")) {
            setCorporateSettlement("on_account");
          } else if (allowed.includes("card")) {
            setCorporateSettlement("card");
          } else {
            setCorporateSettlement(null);
          }
        }
        setVehicleClassId((current) => {
          if (current && accountAllowsVehicleClass(active, current)) return current;
          const allowed = active.allowedVehicleClassIds;
          if (allowed.length === 0) return current;
          const preferredClass = allowed.find((id) =>
            vehicleClasses.some((vc) => vc.id === id && vc.isEnabled)
          );
          return preferredClass ?? null;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setCorporateAccount(null);
          setCorporateSettlement(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customer, corporateFeatureOn, vehicleClasses]);

  useEffect(() => {
    if (!activeCorporateAccount) return;
    setVehicleClassId((current) => {
      if (!current) return current;
      if (accountAllowsVehicleClass(activeCorporateAccount, current)) return current;
      const preferredClass = activeCorporateAccount.allowedVehicleClassIds.find((id) =>
        vehicleClasses.some((vc) => vc.id === id && vc.isEnabled)
      );
      return preferredClass ?? null;
    });
  }, [activeCorporateAccount, vehicleClasses]);

  useEffect(() => {
    if (!activeCorporateAccount || !corporateSettlement) return;
    if (!accountAllowsPayment(activeCorporateAccount, corporateSettlement)) {
      const allowed = activeCorporateAccount.allowedPaymentMethods;
      setCorporateSettlement(allowed[0] ?? null);
    }
  }, [activeCorporateAccount, corporateSettlement]);

  useEffect(() => {
    if (!billToCorporate) return;
    if (appliedPromo) clearPromo();
  }, [billToCorporate]);

  async function applyPromoCode() {
    if (!loyaltyPromosEnabled) return;
    if (applyCorporateRates) {
      setPromoError("Promos are not available when corporate rates apply.");
      return;
    }
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
        null,
        corporateAccountForQuote
      );
      const baseQuote = await resolveBookingQuote(
        baseRequest,
        pricingConfig,
        operatorLocale,
        locations,
        selectedVehicleClass,
        {
          customerId: customer?.id ?? null,
          settlement: corporateSettlement
        }
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
        setPromoExpanded,
        setCorporateAccount,
        setCorporateSettlement
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    Promise.all([
      getCachedPricingConfiguration(),
      getCachedOperatorLocale(getActiveBranchId())
    ])
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
      setPickup(addressFromTrip(trip.journey.pickupAddressLine, trip.journey.pickup));
      setDropoff(addressFromTrip(trip.journey.dropoffAddressLine, trip.journey.dropoff));
      setSelectedAddonIds(trip.journey.bookingAddons?.map((addon) => addon.id) ?? []);
      setPassengerCount(trip.capacity.passengerCount ?? 1);
      setSmallLuggageCount(trip.capacity.luggage.smallCount ?? 0);
      setLargeLuggageCount(trip.capacity.luggage.largeCount ?? 0);
      setScheduledPickupAt(
        editTrip ? (trip.journey.scheduledPickupAt ?? tripPickupReferenceDate(trip)) : null
      );
      setBookedHours(trip.journey.bookedHours ?? 2);
      setNotes(trip.journey.notes ?? "");
      setVehicleClassId(
        trip.quote.vehicleClassId ?? trip.vehicle.vehicleSnapshot?.details?.vehicleClassId ?? null
      );
      setQuotedTotal(trip.quote.quotedTotal ?? null);
      setPromoError(null);
      const existingCode = trip.quote.promoCode?.trim() ?? "";
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
        setPromoExpanded,
        setCorporateAccount,
        setCorporateSettlement
      });
    }
  }, [open, editTrip, sourceTrip, users]);

  useEffect(() => {
    const hourlyBookedHours = isEdit
      ? (editTrip?.journey.bookedHours ?? bookedHours)
      : bookedHours;
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
            promoForQuote,
            corporateAccountForQuote
          );
          const returnRequest = buildQuoteRequestInput(
            "transfer",
            vehicleClassId,
            dropoff,
            pickup,
            scheduledReturnAt!,
            selectedAddonIds,
            null,
            promoForQuote,
            corporateAccountForQuote
          );
          const fingerprint = roundTripQuoteFingerprint(outboundRequest, returnRequest);
          const cached = lastQuoteRef.current;
          if (cached && "outbound" in cached && cached.fingerprint === fingerprint) {
            if (!cancelled) {
              setQuotedTotal(cached.outbound.displayTotal + cached.returnLeg.displayTotal);
            }
            return;
          }

          const [outboundQuote, returnQuote] = await Promise.all([
            resolveBookingQuote(
              outboundRequest,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass,
              {
                customerId: customer?.id ?? null,
                settlement: corporateSettlement
              }
            ),
            resolveBookingQuote(
              returnRequest,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass,
              {
                customerId: customer?.id ?? null,
                settlement: corporateSettlement
              }
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
          promoForQuote,
          corporateAccountForQuote
        );
        const fingerprint = quoteInputFingerprint(request);
        const cached = lastQuoteRef.current;
        if (cached && "quote" in cached && cached.fingerprint === fingerprint) {
          if (!cancelled) setQuotedTotal(cached.quote.displayTotal);
          return;
        }

        const quote = await resolveBookingQuote(
          request,
          pricingConfig,
          operatorLocale,
          locations,
          selectedVehicleClass,
          {
            customerId: customer?.id ?? null,
            settlement: corporateSettlement
          }
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
    appliedPromo,
    promoForQuote,
    corporateAccountForQuote,
    corporateSettlement
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

    const capacityIssues = validateTripAgainstVehicleClass(
      bookingRequirements,
      selectedVehicleClass
    );
    if (capacityIssues.length > 0) {
      setFieldErrors((prev) => ({ ...prev, vehicleClassId: true }));
      toast.error(capacityIssues[0].message);
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

    const editBookedHours = editTrip?.journey.bookedHours ?? bookedHours;
    const submitTripType = isEditMode ? quoteTripType : quoteTripTypeForBookingMode(bookingMode);
    const submitBookedHours =
      submitTripType === "hourly" ? (isEditMode ? editBookedHours : bookedHours) : null;

    const bookingAddons = pricingAddons.filter((addon) => selectedAddonIds.includes(addon.id));
    const sharedCapacityFields: TripCapacity = {
      passengerCount,
      luggage: { smallCount: smallLuggageCount, largeCount: largeLuggageCount }
    };
    const sharedJourneyBookingFields: Pick<TripJourney, "notes" | "bookingAddons"> = {
      notes: notes.trim() || null,
      bookingAddons: bookingAddons.length ? bookingAddons : null
    };
    const corporateBillingFields: TripBilling =
      !isEditMode && billToCorporate && activeCorporateAccount
        ? {
            paymentStatus: "on_account" as const,
            paymentSource: "web" as const,
            corporateAccountId: activeCorporateAccount.id
          }
        : applyCorporateRates && activeCorporateAccount
          ? {
              corporateAccountId: activeCorporateAccount.id
            }
          : {};

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
          promoForQuote,
          corporateAccountForQuote
        );
        const returnRequest = buildQuoteRequestInput(
          "transfer",
          vehicleClassId,
          dropoff,
          pickup,
          scheduledReturnAt!,
          selectedAddonIds,
          null,
          promoForQuote,
          corporateAccountForQuote
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
            resolveBookingQuote(
              outboundRequest,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass,
              {
                customerId: customer?.id ?? null,
                settlement: corporateSettlement
              }
            ),
            resolveBookingQuote(
              returnRequest,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass,
              {
                customerId: customer?.id ?? null,
                settlement: corporateSettlement
              }
            )
          ]);
        }

        const outboundId = crypto.randomUUID();
        const returnId = crypto.randomUUID();
        const now = new Date();
        const customerFields = buildTripCustomerFields(customer);
        const outboundQuoteResult = quoteFieldsFromResult(
          outboundQuote,
          "transfer",
          vehicleClassId,
          selectedVehicleClass.displayName,
          null
        );
        const returnQuoteResult = quoteFieldsFromResult(
          returnQuote,
          "transfer",
          vehicleClassId,
          selectedVehicleClass.displayName,
          null
        );

        const outbound: Trip = {
          id: outboundId,
          status: "requested",
          ...customerFields,
          driverID: null,
          driver: {},
          capacity: sharedCapacityFields,
          vehicle: { vehicleDocumentId: null, vehicleSnapshot: null },
          journey: {
            pickup: pickup.coordinate,
            dropoff: dropoff.coordinate,
            pickupAddressLine: pickup.addressLine,
            dropoffAddressLine: dropoff.addressLine,
            scheduledPickupAt,
            linkedTripID: returnId,
            ...sharedJourneyBookingFields,
            ...outboundQuoteResult.journeyFields
          },
          quote: outboundQuoteResult.quoteFields,
          billing: corporateBillingFields,
          createdAt: now,
          updatedAt: now
        };

        const returnLeg: Trip = {
          id: returnId,
          status: "requested",
          ...customerFields,
          driverID: null,
          driver: {},
          capacity: sharedCapacityFields,
          vehicle: { vehicleDocumentId: null, vehicleSnapshot: null },
          journey: {
            pickup: dropoff.coordinate,
            dropoff: pickup.coordinate,
            pickupAddressLine: dropoff.addressLine,
            dropoffAddressLine: pickup.addressLine,
            scheduledPickupAt: scheduledReturnAt!,
            linkedTripID: outboundId,
            ...sharedJourneyBookingFields,
            ...returnQuoteResult.journeyFields
          },
          quote: returnQuoteResult.quoteFields,
          billing: corporateBillingFields,
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
        promoForQuote,
        corporateAccountForQuote
      );
      const fingerprint = quoteInputFingerprint(request);
      const cached = lastQuoteRef.current;
      const quote =
        cached && "quote" in cached && cached.fingerprint === fingerprint
          ? cached.quote
          : await resolveBookingQuote(
              request,
              pricingConfig,
              operatorLocale,
              locations,
              selectedVehicleClass,
              {
                customerId: customer?.id ?? null,
                settlement: corporateSettlement
              }
            );

      const { journeyFields, quoteFields } = quoteFieldsFromResult(
        quote,
        submitTripType,
        vehicleClassId,
        selectedVehicleClass.displayName,
        submitBookedHours
      );

      if (isEditMode) {
        const customerFields = buildTripCustomerFields(customer);
        await updateTrip(editTrip!.id, {
          customerID: customerFields.customerID,
          customer: customerFields.customer,
          driverID: editTrip!.driverID ?? null,
          vehicle: {
            vehicleDocumentId: editTrip!.vehicle.vehicleDocumentId ?? null,
            vehicleSnapshot: editTrip!.vehicle.vehicleSnapshot ?? null
          },
          capacity: sharedCapacityFields,
          journey: {
            pickup: pickup.coordinate,
            dropoff: dropoff.coordinate,
            pickupAddressLine: pickup.addressLine,
            dropoffAddressLine: dropoff.addressLine,
            scheduledPickupAt,
            ...sharedJourneyBookingFields,
            ...journeyFields
          },
          quote: quoteFields
        });
        toast.success("Booking updated.");
      } else {
        const trip: Trip = {
          id: crypto.randomUUID(),
          status: "requested",
          ...buildTripCustomerFields(customer),
          driverID: null,
          driver: {},
          capacity: sharedCapacityFields,
          vehicle: { vehicleDocumentId: null, vehicleSnapshot: null },
          journey: {
            pickup: pickup.coordinate,
            dropoff: dropoff.coordinate,
            pickupAddressLine: pickup.addressLine,
            dropoffAddressLine: dropoff.addressLine,
            scheduledPickupAt,
            ...sharedJourneyBookingFields,
            ...journeyFields
          },
          quote: quoteFields,
          billing: corporateBillingFields,
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
          <SheetTitle>{isEdit ? "Edit booking" : isRebook ? "Rebook" : "New booking"}</SheetTitle>
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

            {activeCorporateAccount && !isEdit ? (
              <div className="space-y-2">
                <Label>Payment method</Label>
                <div className="flex flex-col gap-2">
                  {accountAllowsPayment(activeCorporateAccount, "on_account") ? (
                    <label className="flex items-center gap-2 text-sm font-normal">
                      <Checkbox
                        id="settlement-on-account"
                        checked={corporateSettlement === "on_account"}
                        onCheckedChange={(checked) => {
                          if (checked === true) setCorporateSettlement("on_account");
                        }}
                        disabled={
                          saving ||
                          (!accountAllowsPayment(activeCorporateAccount, "card") &&
                            corporateSettlement === "on_account")
                        }
                      />
                      <span>
                        {corporatePreferredPaymentTitle.on_account} ({activeCorporateAccount.name})
                      </span>
                    </label>
                  ) : null}
                  {accountAllowsPayment(activeCorporateAccount, "card") ? (
                    <label className="flex items-center gap-2 text-sm font-normal">
                      <Checkbox
                        id="settlement-card"
                        checked={corporateSettlement === "card"}
                        onCheckedChange={(checked) => {
                          if (checked === true) setCorporateSettlement("card");
                        }}
                        disabled={
                          saving ||
                          (!accountAllowsPayment(activeCorporateAccount, "on_account") &&
                            corporateSettlement === "card")
                        }
                      />
                      <span>{corporatePreferredPaymentTitle.card}</span>
                    </label>
                  ) : null}
                </div>
              </div>
            ) : null}

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

            {isEdit && editTrip?.journey.tripType === "hourly" ? (
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
                    {eligibleVehicleClasses.map((vehicleClass) => (
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

            {loyaltyPromosEnabled && !applyCorporateRates ? (
              <div className="space-y-2">
                <Label>Promo code</Label>
                {appliedPromo ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {appliedPromo.code}
                    </Badge>
                    <span className="text-muted-foreground text-sm truncate">
                      {appliedPromo.title}
                    </span>
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
            <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 p-0 sm:justify-between">
              <SheetClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" disabled={saving || quoting}>
                {saving
                  ? isEdit
                    ? "Saving…"
                    : "Creating…"
                  : isEdit
                    ? "Save"
                    : "Create booking"}
              </Button>
            </SheetFooter>

            {quotedTotal != null ? (
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <span className="text-muted-foreground">Estimated total: </span>
                <span className="font-medium">
                  {quoting
                    ? "Calculating…"
                    : currency
                      ? formatCurrency(quotedTotal, currency)
                      : "—"}
                </span>
              </div>
            ) : null}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
