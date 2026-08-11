"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  CarFrontIcon,
  CheckCircle2Icon,
  CheckCircleIcon,
  ChevronLeftIcon,
  CircleDotIcon,
  PackageIcon
} from "lucide-react";

import { useInvoices, useRosterChauffeurs, useTrip, useUsers } from "@/hooks/use-collections";
import { shortBookingId } from "@/lib/bookings/booking-display";
import { effectivePaymentStatus } from "@/lib/bookings/trip-payment";
import {
  TRIP_STATUSES,
  chauffeurCategoryTitle,
  tripPickupReferenceDate,
  tripJourneyTimeLabel,
  tripOnboardDistanceLabel,
  tripStatusTitle,
  tripTypeTitle,
  paymentSourceTitle,
  vehicleDisplayName,
  type Trip,
  type User,
  type Vehicle
} from "@/lib/models";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { appConfig } from "@/lib/env";
import { cn, generateAvatarFallback } from "@/lib/utils";
import { vehicleTierBadgeIcon } from "@/lib/vehicle-badge-icons";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailSheetIconBadge } from "@/components/ui/icon-badge";
import { Progress } from "@/components/ui/progress";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { BookingJourneyMap } from "@/app/dashboard/bookings/[id]/booking-journey-map";

const ACTIVE_STATUSES = TRIP_STATUSES.filter((s) => s !== "cancelled");

const statusStepIcons: Record<(typeof ACTIVE_STATUSES)[number], ReactNode> = {
  requested: <PackageIcon className="size-4 lg:size-5" />,
  accepted: <CheckCircleIcon className="size-4 lg:size-5" />,
  en_route_pickup: <CarFrontIcon className="size-4 lg:size-5" />,
  in_progress: <CircleDotIcon className="size-4 lg:size-5" />,
  completed: <CheckCircle2Icon className="size-4 lg:size-5" />
};

function BookingCustomerCard({
  customer,
  customerName,
  customerEmail,
  customerPhone,
  isCorporate
}: {
  customer: User | undefined;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  isCorporate: boolean;
}) {
  const profileName = customerName?.trim() || "Customer";
  const avatarName = customerName?.trim() || customerEmail?.trim() || "Customer";
  const phone = customerPhone?.trim() || null;

  return (
    <SectionCard
      title="Passenger"
      headerAction={
        <Badge
          variant="outline"
          className={cn(
            "font-medium",
            isCorporate
              ? "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
              : "border-teal-300 bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300"
          )}>
          {isCorporate ? "Corporate" : "Individual"}
        </Badge>
      }>
      <div className="flex items-center gap-4">
        <Avatar className="size-12">
          <AvatarImage src={customer?.profile.photoURL ?? undefined} alt={avatarName} />
          <AvatarFallback>{generateAvatarFallback(avatarName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{profileName}</h3>
          {phone ? <p className="text-muted-foreground text-sm">{phone}</p> : null}
        </div>
      </div>
    </SectionCard>
  );
}

function BookingVehicleCard({
  vehicleSnapshot,
  vehicleClassLabel
}: {
  vehicleSnapshot: Vehicle | null | undefined;
  vehicleClassLabel: string | null;
}) {
  if (!vehicleSnapshot) {
    return (
      <SectionCard title="Vehicle">
        <p className="text-muted-foreground text-sm">No vehicle assigned for this trip.</p>
      </SectionCard>
    );
  }

  const vehicleName = vehicleDisplayName(vehicleSnapshot);
  const plate = vehicleSnapshot.registration?.registrationNumber?.trim() || null;

  return (
    <SectionCard
      title="Vehicle"
      headerAction={
        vehicleClassLabel ? (
          <DetailSheetIconBadge icon={vehicleTierBadgeIcon}>
            {vehicleClassLabel}
          </DetailSheetIconBadge>
        ) : undefined
      }>
      <div className="flex items-center gap-4">
        <VehicleMakeAvatar make={vehicleSnapshot.details?.make} className="size-12" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{vehicleName || "Vehicle"}</h3>
          {plate ? <p className="text-muted-foreground text-sm">{plate}</p> : null}
        </div>
      </div>
    </SectionCard>
  );
}

function luggageLabel(trip: Trip) {
  const { smallCount, largeCount } = trip.capacity.luggage;
  if (smallCount == null && largeCount == null) {
    return "—";
  }
  return `${smallCount ?? 0} small, ${largeCount ?? 0} large`;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground shrink-0 text-sm">{label}</span>
      <span className="text-end text-sm">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  headerAction,
  children
}: {
  title: string;
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      {headerAction ? (
        <div className="flex items-center justify-between gap-4 px-6">
          <CardTitle>{title}</CardTitle>
          <div className="shrink-0">{headerAction}</div>
        </div>
      ) : (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

export function BookingDetail({ tripId }: { tripId: string }) {
  const { trip, loading, notFound } = useTrip(tripId);
  const { users } = useUsers();
  const { chauffeurs } = useRosterChauffeurs();
  const { invoices } = useInvoices();

  const currentStepIndex = trip
    ? ACTIVE_STATUSES.indexOf(trip.status as (typeof ACTIVE_STATUSES)[number])
    : -1;
  const progressValue =
    trip && trip.status !== "cancelled" && currentStepIndex >= 0
      ? (currentStepIndex / (ACTIVE_STATUSES.length - 1)) * 100
      : 0;

  const startedAt = useMemo(() => trip?.journey.journeyStartedAt ?? null, [trip]);
  const completedAt = useMemo(() => trip?.journey.journeyCompletedAt ?? null, [trip]);

  const journeyTime = useMemo(() => (trip ? tripJourneyTimeLabel(trip) : "—"), [trip]);
  const distanceLabel = useMemo(() => (trip ? tripOnboardDistanceLabel(trip) : "—"), [trip]);

  const customer = useMemo(
    () => (trip ? users.find((u) => u.id === trip.customerID) : undefined),
    [trip, users]
  );

  const rosterChauffeur = useMemo(
    () => (trip?.driverID ? chauffeurs.find((c) => c.user.id === trip.driverID) : undefined),
    [trip?.driverID, chauffeurs]
  );

  const chauffeur = useMemo(
    () =>
      rosterChauffeur?.user ??
      (trip?.driverID ? users.find((u) => u.id === trip.driverID) : undefined),
    [rosterChauffeur, trip?.driverID, users]
  );

  const chauffeurName = chauffeur?.profile.displayName || chauffeur?.email || "Unassigned";
  const chauffeurDescription = rosterChauffeur
    ? chauffeurCategoryTitle[rosterChauffeur.roster.chauffeurCategory]
    : chauffeur
      ? chauffeur.email
      : "No chauffeur assigned to this booking";

  const customerName = trip?.customer.displayName || customer?.profile.displayName || null;
  const customerEmail = trip?.customer.email ?? customer?.email ?? null;
  const customerPhone = trip?.customer.phoneNumber ?? customer?.profile.phoneNumber ?? null;
  const isCorporateCustomer = Boolean(
    trip?.billing.corporateAccountId?.trim() || customer?.corporateAccountId?.trim()
  );
  const vehicleClassLabel = trip?.quote.vehicleClassDisplayName?.trim() || null;

  const paymentStatus = trip ? effectivePaymentStatus(trip) : "unpaid";
  const linkedInvoice = useMemo(
    () =>
      trip?.billing.invoiceId
        ? invoices.find((inv) => inv.id === trip.billing.invoiceId)
        : undefined,
    [trip?.billing.invoiceId, invoices]
  );

  if (loading) {
    return (
      <div className="text-muted-foreground mx-auto max-w-screen-lg py-16 text-center text-sm">
        Loading booking…
      </div>
    );
  }

  if (notFound || !trip) {
    return (
      <div className="mx-auto max-w-screen-lg space-y-4">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="bg-background/50 rounded-full">
          <Link href="/dashboard/bookings" aria-label="Back to bookings">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">Booking not found.</p>
      </div>
    );
  }

  const pickupAt = tripPickupReferenceDate(trip);

  return (
    <div className="mx-auto max-w-screen-lg space-y-4">
      <Card className="relative">
        <div className="absolute start-4 top-4 z-10">
          <Button
            asChild
            variant="ghost"
            size="icon-sm"
            className="bg-background/50 rounded-full">
            <Link href="/dashboard/bookings" aria-label="Back to bookings">
              <ChevronLeftIcon />
            </Link>
          </Button>
        </div>
        <CardContent className="pt-14">
          {trip.status === "cancelled" ? (
            <p className="text-muted-foreground text-sm">
              This booking was cancelled on {formatDateTime(trip.updatedAt)}.
            </p>
          ) : (
            <div className="relative space-y-6 pt-1">
              <div className="mb-2 flex items-center justify-between">
                {ACTIVE_STATUSES.map((step, index) => (
                  <div key={step} className="text-center">
                    <div
                      className={`mx-auto flex size-10 items-center justify-center rounded-full text-lg lg:size-12 ${
                        index <= currentStepIndex
                          ? "bg-green-500 text-white dark:bg-green-900"
                          : "bg-muted border"
                      }`}>
                      {index < currentStepIndex ? (
                        <CheckCircleIcon className="size-4 lg:size-5" />
                      ) : (
                        statusStepIcons[step]
                      )}
                    </div>
                    <div className="mt-2 text-xs">{tripStatusTitle[step]}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-6">
                <Progress
                  className="w-full"
                  value={progressValue}
                  indicatorColor="bg-green-500 dark:bg-green-600"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Booking summary">
            <Item variant="outline" className="w-full">
              <ItemMedia>
                <Avatar className="size-10">
                  <AvatarImage src={chauffeur?.profile.photoURL ?? undefined} alt={chauffeurName} />
                  <AvatarFallback>{generateAvatarFallback(chauffeurName)}</AvatarFallback>
                </Avatar>
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{chauffeurName}</ItemTitle>
                <ItemDescription>{chauffeurDescription}</ItemDescription>
              </ItemContent>
            </Item>
            <DetailRow label="Booking ID" value={shortBookingId(trip.id)} />
            <DetailRow label="Pickup date and time" value={formatDateTime(pickupAt)} />
            <DetailRow
              label="Passengers"
              value={
                trip.capacity.passengerCount != null
                  ? `${trip.capacity.passengerCount} pax`
                  : "—"
              }
            />
            <DetailRow label="Luggage requirements" value={luggageLabel(trip)} />
          </SectionCard>

          <SectionCard title="Journey">
            <BookingJourneyMap
              pickup={trip.journey.pickup}
              dropoff={trip.journey.dropoff}
              pickupLabel={trip.journey.pickupAddressLine}
              dropoffLabel={trip.journey.dropoffAddressLine}
            />
          </SectionCard>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <SectionCard
            title="Trip summary"
            headerAction={<TripStatusBadge status={trip.status} />}>
            <DetailRow label="Requested:" value={formatDateTime(trip.createdAt)} />
            <DetailRow
              label="Trip type:"
              value={trip.journey.tripType ? tripTypeTitle[trip.journey.tripType] : "—"}
            />
            <DetailRow label="Started:" value={startedAt ? formatDateTime(startedAt) : "—"} />
            <DetailRow label="Completed:" value={completedAt ? formatDateTime(completedAt) : "—"} />
            <DetailRow label="Duration:" value={journeyTime} />
            <DetailRow label="Distance:" value={distanceLabel} />
          </SectionCard>

          <BookingCustomerCard
            customer={customer}
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            isCorporate={isCorporateCustomer}
          />

          <BookingVehicleCard
            vehicleSnapshot={trip.vehicle.vehicleSnapshot}
            vehicleClassLabel={vehicleClassLabel}
          />

          <SectionCard title="Payment" headerAction={<PaymentStatusBadge status={paymentStatus} />}>
            <DetailRow
              label="Source:"
              value={
                trip.billing.paymentSource ? paymentSourceTitle[trip.billing.paymentSource] : "—"
              }
            />
            <DetailRow
              label="Paid at:"
              value={trip.billing.paidAt ? formatDateTime(trip.billing.paidAt) : "—"}
            />
            {linkedInvoice ? (
              <DetailRow
                label="Invoice:"
                value={
                  <Link
                    href="/dashboard/billing"
                    className="text-primary underline-offset-4 hover:underline">
                    {linkedInvoice.invoiceNumber}
                  </Link>
                }
              />
            ) : trip.billing.invoiceId ? (
              <DetailRow label="Invoice:" value={shortBookingId(trip.billing.invoiceId)} />
            ) : null}
          </SectionCard>

          <SectionCard title="Pricing">
            <DetailRow
              label="Base Fare:"
              value={
                trip.quote.quotedSubtotal != null
                  ? formatCurrency(
                      trip.quote.quotedSubtotal,
                      trip.quote.quotedCurrencyCode ?? appConfig.currency
                    )
                  : "—"
              }
            />
            <DetailRow
              label="GST:"
              value={
                trip.quote.quotedTaxAmount != null
                  ? formatCurrency(
                      trip.quote.quotedTaxAmount,
                      trip.quote.quotedCurrencyCode ?? appConfig.currency
                    )
                  : "—"
              }
            />
            <DetailRow
              label="Total:"
              value={
                trip.quote.quotedTotal != null
                  ? formatCurrency(
                      trip.quote.quotedTotal,
                      trip.quote.quotedCurrencyCode ?? appConfig.currency
                    )
                  : "—"
              }
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
