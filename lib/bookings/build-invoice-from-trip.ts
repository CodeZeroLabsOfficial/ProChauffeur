import type { InvoiceLineItem, Trip } from "@/lib/models";

/** Build invoice line items from a trip's quote breakdown, with a fallback to quoted total. */
export function buildInvoiceLineItemsFromTrip(trip: Trip): InvoiceLineItem[] {
  if (trip.quoteBreakdown?.length) {
    return trip.quoteBreakdown.map((line) => ({
      id: line.id,
      label: line.label,
      amount: line.amount
    }));
  }

  if (trip.quotedTotal != null && trip.quotedTotal > 0) {
    return [
      {
        id: "quoted-total",
        label: "Trip fare",
        amount: trip.quotedTotal
      }
    ];
  }

  return [];
}
