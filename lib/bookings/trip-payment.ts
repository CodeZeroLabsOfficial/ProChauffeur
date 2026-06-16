import type { PaymentStatus, Trip } from "@/lib/models";

/** Effective payment status for display — treats missing field as unpaid. */
export function effectivePaymentStatus(trip: Trip): PaymentStatus {
  return trip.paymentStatus ?? "unpaid";
}

/** Whether an admin can send a Stripe invoice for this booking. */
export function canSendTripInvoice(trip: Trip): boolean {
  const status = effectivePaymentStatus(trip);
  return status !== "paid" && status !== "pending" && status !== "invoiced";
}
