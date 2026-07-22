import {
  computePromoDiscountAmount,
  promoConditionFailureMessage,
  promoConditionsFailure,
  type PromoConditionContext,
  type Promotion
} from "@/lib/models/promotion";
import type { QuoteLineItem, QuotePromoApplication } from "@/lib/models/quote";

export type ApplyPromoResult =
  | { ok: true; promo: QuotePromoApplication }
  | { ok: false; reason: string };

/** Validate a promo against booking context; returns application payload or reason. */
export function resolvePromoApplication(
  promo: Promotion,
  ctx: PromoConditionContext
): ApplyPromoResult {
  const failure = promoConditionsFailure(promo, ctx);
  if (failure) {
    return { ok: false, reason: promoConditionFailureMessage[failure] };
  }
  return {
    ok: true,
    promo: {
      id: promo.id,
      title: promo.title,
      code: promo.code,
      type: promo.type,
      value: promo.value
    }
  };
}

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
