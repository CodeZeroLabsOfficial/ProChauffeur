import type { InvoiceLineItem, Trip } from "@/lib/models";

/** Build invoice line items from a trip's quote breakdown, with a fallback to quoted total. */
export function buildInvoiceLineItemsFromTrip(trip: Trip): InvoiceLineItem[] {
  if (trip.quote.quoteBreakdown?.length) {
    return trip.quote.quoteBreakdown.map((line) => ({
      id: line.id,
      label: line.label,
      amount: line.amount
    }));
  }

  if (trip.quote.quotedTotal != null && trip.quote.quotedTotal > 0) {
    return [
      {
        id: "quoted-total",
        label: "Trip fare",
        amount: trip.quote.quotedTotal
      }
    ];
  }

  return [];
}
