"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  CarFrontIcon,
  CheckCircle2Icon,
  CheckCircleIcon,
  ChevronLeftIcon,
  CircleDotIcon,
  Mail,
  MapPin,
  PackageIcon,
  PencilIcon,
  PhoneCall,
  PrinterIcon
} from "lucide-react";
import { toast } from "sonner";

import { useTrip, useUsers } from "@/hooks/use-collections";
import { updateTripStatus } from "@/lib/services/firebase-service";
import {
  TRIP_STATUSES,
  chauffeurCategoryTitle,
  tripPickupReferenceDate,
  tripJourneyTimeLabel,
  tripStatusTitle,
  vehicleTypeTitle,
  type Trip,
  type TripStatus,
  type User,
  type Vehicle,
  type VehicleType
} from "@/lib/models";
import {
  formatPostalAddress,
  postalAddressFromTripSnapshot
} from "@/lib/models/postal-address";
import { tripTypeTitle } from "@/lib/models";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { appConfig } from "@/lib/env";
import { generateAvatarFallback } from "@/lib/utils";
import { VehicleMakeAvatar } from "@/components/vehicle-make-avatar";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle
} from "@/components/ui/item";
import { BookingJourneyMap } from "@/app/dashboard/bookings/[id]/booking-journey-map";

const ACTIVE_STATUSES = TRIP_STATUSES.filter((s) => s !== "cancelled");

const statusStepIcons: Record<(typeof ACTIVE_STATUSES)[number], ReactNode> = {
  requested: <PackageIcon className="size-4 lg:size-5" />,
  accepted: <CheckCircleIcon className="size-4 lg:size-5" />,
  en_route_pickup: <CarFrontIcon className="size-4 lg:size-5" />,
  in_progress: <CircleDotIcon className="size-4 lg:size-5" />,
  completed: <CheckCircle2Icon className="size-4 lg:size-5" />
};

function shortBookingId(id: string) {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

function ContactRow({
  icon: Icon,
  children
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="text-muted-foreground size-4 shrink-0" />
      {children}
    </div>
  );
}

function BookingCustomerCard({
  customer,
  customerName,
  customerAddress,
  customerPhone,
  customerEmail,
  customerCompany
}: {
  customer: User | undefined;
  customerName: string | null;
  customerAddress: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerCompany: string | null;
}) {
  const hasCustomerDetails = Boolean(
    customerName?.trim() ||
      customerAddress?.trim() ||
      customerPhone?.trim() ||
      customerEmail?.trim() ||
      customerCompany?.trim()
  );

  if (!hasCustomerDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Passenger</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No customer details on file.</p>
        </CardContent>
      </Card>
    );
  }

  const profileName = customerName?.trim() || "Customer";
  const profileSubtitle = customerCompany?.trim() || customerEmail?.trim() || "Customer";
  const showSubtitle = profileSubtitle !== profileName || !customerName?.trim();
  const avatarName = customerName?.trim() || customerEmail?.trim() || "Customer";
  const showEmailInContact = Boolean(customerEmail?.trim() && customerCompany?.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passenger</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar className="size-12">
            <AvatarImage src={customer?.profile.photoURL ?? undefined} alt={avatarName} />
            <AvatarFallback>{generateAvatarFallback(avatarName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold">{profileName}</h3>
            {showSubtitle ? (
              <p className="text-muted-foreground text-sm">{profileSubtitle}</p>
            ) : null}
          </div>
        </div>

        {customerAddress?.trim() || customerPhone?.trim() || showEmailInContact ? (
          <div className="mt-4 space-y-3">
            {customerAddress?.trim() ? (
              <ContactRow icon={MapPin}>{customerAddress}</ContactRow>
            ) : null}
            {customerPhone?.trim() ? (
              <ContactRow icon={PhoneCall}>{customerPhone}</ContactRow>
            ) : null}
            {showEmailInContact ? (
              <ContactRow icon={Mail}>{customerEmail}</ContactRow>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function vehicleSnapshotLuggageLabel(vehicle: Vehicle) {
  if (vehicle.luggageDescription?.trim()) {
    return vehicle.luggageDescription.trim();
  }
  if (vehicle.fleetSmallLuggageCount != null || vehicle.fleetLargeLuggageCount != null) {
    return `${vehicle.fleetSmallLuggageCount ?? 0} small, ${vehicle.fleetLargeLuggageCount ?? 0} large`;
  }
  return null;
}

function BookingVehicleCard({ vehicleSnapshot }: { vehicleSnapshot: Vehicle | null | undefined }) {
  if (!vehicleSnapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No vehicle assigned for this trip.</p>
        </CardContent>
      </Card>
    );
  }

  const vehicleName = `${vehicleSnapshot.color} ${vehicleSnapshot.make} ${vehicleSnapshot.model}`.trim();
  const vehicleType = vehicleSnapshot.pricingVehicleType
    ? vehicleTypeTitle[vehicleSnapshot.pricingVehicleType as VehicleType]
    : null;
  const plate = vehicleSnapshot.licensePlate?.trim();
  const subtitle = [vehicleType, plate].filter(Boolean).join(" • ");
  const luggage = vehicleSnapshotLuggageLabel(vehicleSnapshot);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <VehicleMakeAvatar make={vehicleSnapshot.make} className="size-12" />
          <div className="flex-1">
            <h3 className="font-semibold">{vehicleName || "Vehicle"}</h3>
            {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
          </div>
        </div>

        {vehicleSnapshot.passengerCapacity != null ||
        vehicleSnapshot.manufactureYear != null ||
        luggage ? (
          <div className="mt-4 space-y-3">
            {vehicleSnapshot.passengerCapacity != null ? (
              <DetailRow
                label="Passengers"
                value={vehicleSnapshot.passengerCapacity}
              />
            ) : null}
            {vehicleSnapshot.manufactureYear != null ? (
              <DetailRow label="Year" value={vehicleSnapshot.manufactureYear} />
            ) : null}
            {luggage ? <DetailRow label="Luggage" value={luggage} /> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function luggageLabel(trip: Trip) {
  if (trip.bookingSmallLuggageCount == null && trip.bookingLargeLuggageCount == null) {
    return "—";
  }
  return `${trip.bookingSmallLuggageCount ?? 0} small, ${trip.bookingLargeLuggageCount ?? 0} large`;
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

  const currentStepIndex = trip ? ACTIVE_STATUSES.indexOf(trip.status as (typeof ACTIVE_STATUSES)[number]) : -1;
  const progressValue =
    trip && trip.status !== "cancelled" && currentStepIndex >= 0
      ? (currentStepIndex / (ACTIVE_STATUSES.length - 1)) * 100
      : 0;

  const completedAt = useMemo(() => trip?.journeyCompletedAt ?? null, [trip]);

  const journeyTime = useMemo(() => (trip ? tripJourneyTimeLabel(trip) : "—"), [trip]);

  const customer = useMemo(
    () => (trip ? users.find((u) => u.id === trip.customerID) : undefined),
    [trip, users]
  );

  const chauffeur = useMemo(
    () => (trip?.driverID ? users.find((u) => u.id === trip.driverID) : undefined),
    [trip?.driverID, users]
  );

  const chauffeurName = chauffeur?.profile.displayName || chauffeur?.email || "Unassigned";
  const chauffeurDescription = chauffeur
    ? chauffeur.driverProfile
      ? chauffeurCategoryTitle[chauffeur.driverProfile.chauffeurCategory]
      : chauffeur.email
    : "No chauffeur assigned to this booking";

  const customerName =
    trip?.customerDisplayName || customer?.profile.displayName || null;
  const customerAddress = trip
    ? formatPostalAddress(postalAddressFromTripSnapshot(trip))
    : null;
  const customerPhone = trip?.customerPhoneNumber ?? customer?.profile.phoneNumber ?? null;
  const customerEmail = trip?.customerEmail ?? customer?.email ?? null;
  const customerCompany = trip?.customerCompany ?? null;

  async function changeStatus(status: TripStatus) {
    if (!trip) return;
    try {
      await updateTripStatus(trip.id, status);
      toast.success(`Marked as ${tripStatusTitle[status]}.`);
    } catch {
      toast.error("Could not update the booking.");
    }
  }

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
        <Button asChild variant="outline">
          <Link href="/dashboard/bookings">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <p className="text-muted-foreground text-sm">Booking not found.</p>
      </div>
    );
  }

  const pickupAt = tripPickupReferenceDate(trip);

  return (
    <div className="mx-auto max-w-screen-lg space-y-4 lg:mt-10">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/dashboard/bookings">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <PrinterIcon />
            Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <PencilIcon />
                Edit
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Set status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TRIP_STATUSES.map((s) => (
                <DropdownMenuItem key={s} disabled={s === trip.status} onClick={() => changeStatus(s)}>
                  {tripStatusTitle[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trip status</CardTitle>
        </CardHeader>
        <CardContent>
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
              value={trip.bookingPassengerCount != null ? trip.bookingPassengerCount : "—"}
            />
            <DetailRow label="Luggage requirements" value={luggageLabel(trip)} />
          </SectionCard>

          <SectionCard title="Journey">
            <BookingJourneyMap
              pickup={trip.pickup}
              dropoff={trip.dropoff}
              pickupLabel={trip.pickupAddressLine}
              dropoffLabel={trip.dropoffAddressLine}
            />
          </SectionCard>
        </div>

        <div className="space-y-4 lg:col-span-1">
          <SectionCard
            title="Booking status"
            headerAction={<TripStatusBadge status={trip.status} />}>
            <DetailRow label="Requested:" value={formatDateTime(trip.createdAt)} />
            <DetailRow
              label="Completed:"
              value={completedAt ? formatDateTime(completedAt) : "—"}
            />
            <DetailRow label="Journey time:" value={journeyTime} />
          </SectionCard>

          <BookingCustomerCard
            customer={customer}
            customerName={customerName}
            customerAddress={customerAddress}
            customerPhone={customerPhone}
            customerEmail={customerEmail}
            customerCompany={customerCompany}
          />

          <BookingVehicleCard vehicleSnapshot={trip.vehicleSnapshot} />

          <SectionCard title="Pricing">
            <DetailRow
              label="Trip type:"
              value={trip.tripType ? tripTypeTitle[trip.tripType] : "—"}
            />
            <DetailRow
              label="Vehicle tier:"
              value={trip.pricingVehicleType ?? trip.vehicleSnapshot?.pricingVehicleType ?? "—"}
            />
            {trip.tripType === "hourly" ? (
              <DetailRow label="Booked hours:" value={trip.bookedHours ?? "—"} />
            ) : null}
            <DetailRow
              label="Quoted total:"
              value={
                trip.quotedTotal != null
                  ? formatCurrency(trip.quotedTotal, trip.quotedCurrencyCode ?? appConfig.currency)
                  : "—"
              }
            />
          </SectionCard>

          <SectionCard title="Extras / Add-ons">
            {trip.bookingAddons?.length ? (
              <ul className="text-muted-foreground space-y-1 text-sm">
                {trip.bookingAddons.map((addon) => (
                  <li key={addon.id}>
                    {addon.title} (
                    {formatCurrency(addon.price, trip.quotedCurrencyCode ?? appConfig.currency)})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No add-ons or extras recorded.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
