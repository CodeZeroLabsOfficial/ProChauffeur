import {
  promoConditionFailureMessage,
  promoConditionsFailure,
  type PromoConditionContext,
  type Promotion
} from "@/lib/models/promotion";
import type { QuotePromoApplication } from "@/lib/models/quote";

export { applyPromoDiscountLayer } from "@prochauffeur/pricing";

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
