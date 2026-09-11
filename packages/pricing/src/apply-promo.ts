import { computePromoDiscountAmount } from "../../../lib/models/promotion";
import type { QuoteLineItem, QuotePromoApplication } from "../../../lib/models/quote";

export function applyPromoDiscountLayer(
  amount: number,
  lines: QuoteLineItem[],
  applied: QuotePromoApplication | null | undefined,
  lineId: () => string
): { amount: number; lines: QuoteLineItem[] } {
  if (!applied) return { amount, lines };
  const discount = computePromoDiscountAmount(applied, amount);
  if (discount <= 0) return { amount, lines };
  return {
    amount: Math.max(0, Math.round((amount - discount) * 100) / 100),
    lines: [
      ...lines,
      {
        id: lineId(),
        label: applied.title || applied.code || "Promo",
        amount: -discount,
        category: "discount",
        isInternal: false
      }
    ]
  };
}
