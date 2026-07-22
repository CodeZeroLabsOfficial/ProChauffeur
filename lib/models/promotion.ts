import type { TripType } from "@/lib/models/enums";

export const PROMOTION_DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type PromotionDiscountType = (typeof PROMOTION_DISCOUNT_TYPES)[number];

/** Optional axes — empty/null means no restriction on that axis. */
export interface PromotionConditions {
  /** Limit to these Locations; null/empty = all. */
  branchIds?: string[] | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  /** Empty = all trip types. */
  tripTypes?: TripType[] | null;
  /** Empty = all vehicle classes. */
  vehicleClassIds?: string[] | null;
  /** Global redemption cap. */
  maxRedemptions?: number | null;
  /** Max uses per customer (welcome-style = 1). */
  perCustomerLimit?: number | null;
  /** Require pre-discount subtotal ≥ this amount. */
  minimumSubtotal?: number | null;
}

/** Company-global promo — `promotions/{id}`. */
export interface Promotion {
  id: string;
  title: string;
  /** Unique normalized code customers enter. */
  code: string;
  isEnabled: boolean;
  type: PromotionDiscountType;
  /** Percent as fraction (0.25 = 25%) or fixed currency amount. */
  value: number;
  conditions: PromotionConditions;
  redemptionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function emptyPromotionConditions(): PromotionConditions {
  return {
    branchIds: null,
    startsAt: null,
    endsAt: null,
    tripTypes: null,
    vehicleClassIds: null,
    maxRedemptions: null,
    perCustomerLimit: null,
    minimumSubtotal: null
  };
}

export function buildNewPromotion(): Promotion {
  const now = new Date();
  return {
    id: crypto.randomUUID(),
    title: "",
    code: "",
    isEnabled: true,
    type: "percent",
    value: 0.1,
    conditions: emptyPromotionConditions(),
    redemptionCount: 0,
    createdAt: now,
    updatedAt: now
  };
}

export interface PromoConditionContext {
  branchId: string;
  tripType: TripType;
  vehicleClassId: string;
  /** Instant used for schedule window (usually scheduled pickup). */
  at: Date;
  /** Pre-discount amount before the discount layer. */
  subtotalBeforeDiscount: number;
  globalRedemptionCount: number;
  customerRedemptionCount: number;
}

export type PromoConditionFailure =
  | "disabled"
  | "location"
  | "schedule"
  | "trip_type"
  | "vehicle_class"
  | "max_redemptions"
  | "per_customer_limit"
  | "minimum_subtotal";

export const promoConditionFailureMessage: Record<PromoConditionFailure, string> = {
  disabled: "This promo code is not active.",
  location: "This promo is not available for this Location.",
  schedule: "This promo is outside its valid dates.",
  trip_type: "This promo does not apply to this trip type.",
  vehicle_class: "This promo does not apply to this service class.",
  max_redemptions: "This promo has reached its usage limit.",
  per_customer_limit: "This customer has already used this promo the maximum number of times.",
  minimum_subtotal: "This promo requires a higher fare before discount."
};

/** Returns null when all configured conditions pass. */
export function promoConditionsFailure(
  promo: Promotion,
  ctx: PromoConditionContext
): PromoConditionFailure | null {
  if (!promo.isEnabled) return "disabled";

  const c = promo.conditions;
  const branchIds = c.branchIds?.filter(Boolean) ?? [];
  if (branchIds.length > 0 && !branchIds.includes(ctx.branchId)) return "location";

  if (c.startsAt && ctx.at.getTime() < c.startsAt.getTime()) return "schedule";
  if (c.endsAt && ctx.at.getTime() > c.endsAt.getTime()) return "schedule";

  const tripTypes = c.tripTypes?.filter(Boolean) ?? [];
  if (tripTypes.length > 0 && !tripTypes.includes(ctx.tripType)) return "trip_type";

  const classIds = c.vehicleClassIds?.filter(Boolean) ?? [];
  if (classIds.length > 0 && !classIds.includes(ctx.vehicleClassId)) return "vehicle_class";

  if (c.maxRedemptions != null && ctx.globalRedemptionCount >= c.maxRedemptions) {
    return "max_redemptions";
  }
  if (c.perCustomerLimit != null && ctx.customerRedemptionCount >= c.perCustomerLimit) {
    return "per_customer_limit";
  }
  if (c.minimumSubtotal != null && ctx.subtotalBeforeDiscount < c.minimumSubtotal) {
    return "minimum_subtotal";
  }

  return null;
}

export function computePromoDiscountAmount(
  promo: Pick<Promotion, "type" | "value">,
  amount: number
): number {
  if (amount <= 0 || promo.value <= 0) return 0;
  const raw =
    promo.type === "percent" ? amount * promo.value : Math.min(promo.value, amount);
  return Math.min(amount, Math.max(0, Math.round(raw * 100) / 100));
}
