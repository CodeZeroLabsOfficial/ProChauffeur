import type { TripJourney, TripQuote, TripType } from "@/lib/models";
import type { QuoteResult } from "@/lib/models/quote";

/**
 * Maps a shared-engine {@link QuoteResult} onto trip quote fields.
 * Dashboard create/edit must write money only through this mapper (Phase 4 freeze).
 */
export function quoteFieldsFromResult(
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

/** Trip.quote money fields overwritten by server card re-quote (same as dashboard freeze). */
export function tripQuoteMoneyFromEngineResult(
  quoteResult: Pick<
    QuoteResult,
    | "subtotal"
    | "taxAmount"
    | "total"
    | "currencyCode"
    | "quotedTaxRate"
    | "quotedPricesIncludeTax"
    | "breakdown"
    | "snapshot"
  >,
  quoteComputedAt: Date | string = new Date()
): Partial<TripQuote> {
  return {
    quotedSubtotal: quoteResult.subtotal,
    quotedTaxAmount: quoteResult.taxAmount,
    quotedTotal: quoteResult.total,
    quotedCurrencyCode: quoteResult.currencyCode,
    quotedTaxRate: quoteResult.quotedTaxRate,
    quotedPricesIncludeTax: quoteResult.quotedPricesIncludeTax,
    quoteBreakdown: quoteResult.breakdown,
    quoteSnapshot: quoteResult.snapshot,
    quoteComputedAt:
      typeof quoteComputedAt === "string" ? new Date(quoteComputedAt) : quoteComputedAt,
    appliedPromoId: quoteResult.snapshot.appliedPromoId,
    promoCode: quoteResult.snapshot.promoCode
  };
}
