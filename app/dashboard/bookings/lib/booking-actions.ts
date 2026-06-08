import type { TripStatus } from "@/lib/models";

const EDITABLE_BOOKING_STATUSES: TripStatus[] = ["requested", "accepted"];

export function canEditBooking(status: TripStatus): boolean {
  return EDITABLE_BOOKING_STATUSES.includes(status);
}
