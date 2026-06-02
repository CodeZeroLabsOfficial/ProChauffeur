"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  CarFrontIcon,
  CheckCircle2Icon,
  CheckCircleIcon,
  ChevronLeftIcon,
  CircleDotIcon,
  MapPinIcon,
  PackageIcon,
  PencilIcon,
  PrinterIcon,
  UserIcon
} from "lucide-react";
import { toast } from "sonner";

import { useTrip, useUsers } from "@/hooks/use-collections";
import { updateTripStatus } from "@/lib/services/firebase-service";
import {
  TRIP_STATUSES,
  tripPickupReferenceDate,
  tripStatusTitle,
  vehicleTypeTitle,
  type TripStatus,
  type VehicleType
} from "@/lib/models";
import { formatDate, formatDateTime } from "@/lib/format";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

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

function vehicleLabel(trip: NonNullable<ReturnType<typeof useTrip>["trip"]>) {
  const v = trip.vehicleSnapshot;
  if (!v) return "—";
  const type = v.pricingVehicleType
    ? vehicleTypeTitle[v.pricingVehicleType as VehicleType]
    : null;
  const desc = `${v.color} ${v.make} ${v.model}`.trim();
  return type ? `${desc} (${type})` : desc;
}

export function BookingDetail({ tripId }: { tripId: string }) {
  const { trip, loading, notFound } = useTrip(tripId);
  const { users } = useUsers();

  const chauffeurName = useMemo(() => {
    if (!trip?.driverID) return "Unassigned";
    const u = users.find((user) => user.id === trip.driverID);
    return u?.profile.displayName || u?.email || "Unknown";
  }, [trip?.driverID, users]);

  const currentStepIndex = trip ? ACTIVE_STATUSES.indexOf(trip.status as (typeof ACTIVE_STATUSES)[number]) : -1;
  const progressValue =
    trip && trip.status !== "cancelled" && currentStepIndex >= 0
      ? (currentStepIndex / (ACTIVE_STATUSES.length - 1)) * 100
      : 0;

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
  const detailRows = [
    { label: "Pickup", value: trip.pickupAddressLine || "—" },
    { label: "Drop-off", value: trip.dropoffAddressLine || "—" },
    { label: "Pickup date and time", value: formatDateTime(pickupAt) },
    { label: "Vehicle", value: vehicleLabel(trip) },
    {
      label: "Passengers",
      value: trip.bookingPassengerCount != null ? String(trip.bookingPassengerCount) : "—"
    },
    {
      label: "Luggage",
      value:
        trip.bookingSmallLuggageCount != null || trip.bookingLargeLuggageCount != null
          ? `${trip.bookingSmallLuggageCount ?? 0} small, ${trip.bookingLargeLuggageCount ?? 0} large`
          : "—"
    },
    { label: "Notes", value: trip.notes?.trim() || "—" }
  ];

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

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Booking {shortBookingId(trip.id)}
            </CardTitle>
            <p className="text-muted-foreground text-sm">Placed on {formatDate(trip.createdAt)}</p>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Customer information</h3>
                <p className="text-muted-foreground text-sm">
                  {trip.customerDisplayName || "Customer"}
                </p>
                {trip.customerEmail && (
                  <p className="text-muted-foreground text-sm">{trip.customerEmail}</p>
                )}
                {trip.customerPhoneNumber && (
                  <p className="text-muted-foreground text-sm">{trip.customerPhoneNumber}</p>
                )}
                {trip.pickupAddressLine && (
                  <p className="text-muted-foreground text-sm">{trip.pickupAddressLine}</p>
                )}
              </div>
              <div className="bg-muted flex items-center justify-between rounded-md border p-4">
                <div className="space-y-1">
                  <h4 className="font-medium">Chauffeur</h4>
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <UserIcon className="size-4" />
                    {chauffeurName}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Pickup</span>
              <span className="text-muted-foreground text-end text-sm">{formatDateTime(pickupAt)}</span>
            </div>
            <div className="flex justify-between">
              <span>Passengers</span>
              <span>{trip.bookingPassengerCount ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span>Luggage</span>
              <span className="text-muted-foreground text-sm">
                {trip.bookingSmallLuggageCount ?? 0} small / {trip.bookingLargeLuggageCount ?? 0}{" "}
                large
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between font-semibold">
              <span>Status</span>
              <TripStatusBadge status={trip.status} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trip status</CardTitle>
        </CardHeader>
        <CardContent>
          {trip.status === "cancelled" ? (
            <p className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
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
                <div className="text-muted-foreground text-xs">
                  <Badge variant="info" className="me-1">
                    {tripStatusTitle[trip.status]}
                  </Badge>
                  updated {formatDateTime(trip.updatedAt)}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Booking details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Detail</TableHead>
                <TableHead className="text-end">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailRows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {row.label === "Pickup" || row.label === "Drop-off" ? (
                        <MapPinIcon className="text-muted-foreground size-4 shrink-0" />
                      ) : null}
                      <span>{row.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-end">{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
