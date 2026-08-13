import type { TripType } from "@/lib/models/enums";
import type { HourlyPricingRates, TransferPricingRates } from "@/lib/models/pricing";

export const CORPORATE_ACCOUNT_STATUSES = ["active", "suspended"] as const;
export type CorporateAccountStatus = (typeof CORPORATE_ACCOUNT_STATUSES)[number];

export const CORPORATE_RATE_MODES = ["percentOff", "fixedRates"] as const;
export type CorporateRateMode = (typeof CORPORATE_RATE_MODES)[number];

export const CORPORATE_PREFERRED_PAYMENTS = ["card", "on_account"] as const;
export type CorporatePreferredPayment = (typeof CORPORATE_PREFERRED_PAYMENTS)[number];

/** Checkout methods linked members may use (multi-select policy). */
export const CORPORATE_ALLOWED_PAYMENTS = CORPORATE_PREFERRED_PAYMENTS;
export type CorporateAllowedPayment = CorporatePreferredPayment;

/** Last calendar day of each month, or a fixed day number 1–28. */
export type CorporateBillingDay = "last" | number;

/** Negotiated class rates when `rateMode` is `fixedRates`. */
export interface CorporateFixedRateOverride {
  id: string;
  vehicleClassId: string;
  tripType: TripType;
  /** Partial transfer overrides; applied over retail class rates. */
  transfer?: Partial<TransferPricingRates> | null;
  /** Partial hourly overrides; applied over retail class rates. */
  hourly?: Partial<HourlyPricingRates> | null;
  /** Optional all-in flat transfer for this class (ignores distance breakdown). */
  fixedTransferRate?: number | null;
}

/**
 * Corporate (business) billing account — `corporateAccounts/{id}`.
 * Company-wide; members link via `users.corporateAccountId`.
 * Managed only in the Web App (admin write).
 *
 * Soft downgrade playbook when `corporateAccounts` is off on the license:
 * - Keep this document and member `corporateAccountId` links.
 * - Hide Accounts UI; refuse join-code claims and corporate quotes.
 * - Members check out with retail payment methods and retail client quotes.
 * - Existing on-account trips / invoices remain; new corporate economics do not apply.
 */
export interface CorporateAccount {
  id: string;
  name: string;
  /** Company logo / avatar URL in Storage. */
  logoUrl?: string | null;
  /** Company contact email (not billing contact). */
  email?: string | null;
  /**
   * Accounts / AP inbox for period invoices (e.g. accounts@).
   * Prefer over `email` and billing contact when sending invoices / syncing Stripe.
   */
  billingEmail?: string | null;
  /** Company phone (not billing contact). */
  phone?: string | null;
  abn?: string | null;
  acn?: string | null;
  industry?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  country?: string | null;
  /** Customer `users/{uid}` — primary contact for this account. */
  primaryContactUserId?: string | null;
  /** Customer `users/{uid}` — billing contact for this account. */
  billingContactUserId?: string | null;
  /** Team admin `users/{uid}` with `role: "admin"`. */
  accountManagerUserId?: string | null;
  /**
   * Company product ids (`vehicle_classes/{id}` / slug). Empty = any class
   * the booking Location offers.
   */
  allowedVehicleClassIds: string[];
  /** Quote total above this requires admin approval before dispatch. */
  maxRideAmount?: number | null;
  /** Calendar-month on-account spend cap; null = unlimited. */
  monthlyBudget?: number | null;
  /**
   * Methods linked members may use at checkout.
   * At least one required; `preferredPayment` must be in this set when set.
   */
  allowedPaymentMethods: CorporateAllowedPayment[];
  /** Default among `allowedPaymentMethods`; null = no preference. */
  preferredPayment?: CorporatePreferredPayment | null;
  /** Display/policy flag; does not rewrite the tax engine. */
  gstInclusive: boolean;
  status: CorporateAccountStatus;
  /** Invoice issue day: last day of month, or 1–28. */
  billingDay: CorporateBillingDay;
  /** Days after issue until due. */
  paymentTermsDays: number;
  /** Exclusive: percent off retail, or fixed class rates — never both. */
  rateMode: CorporateRateMode;
  /** Fraction when `rateMode` is `percentOff` (0.15 = 15%). */
  percentOff?: number | null;
  /** Class overrides when `rateMode` is `fixedRates`. */
  fixedRates: CorporateFixedRateOverride[];
  /**
   * Optional join code for self-serve signup.
   * Normalized uppercase; claim via Cloud Function only.
   */
  joinCode?: string | null;
  /** Soft credit cap in account currency; null = unlimited. */
  creditLimit?: number | null;
  /** Stripe Customer id for company invoicing (server-written). */
  stripeCustomerId?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function normalizeCorporateJoinCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function isCorporateAllowedPayment(value: unknown): value is CorporateAllowedPayment {
  return (
    typeof value === "string" &&
    (CORPORATE_ALLOWED_PAYMENTS as readonly string[]).includes(value)
  );
}

/** Normalize allow-list; empty / missing defaults to on-account only. */
export function normalizeAllowedPaymentMethods(raw: unknown): CorporateAllowedPayment[] {
  const fromArray = Array.isArray(raw)
    ? raw.filter(isCorporateAllowedPayment)
    : [];
  const unique = [...new Set(fromArray)];
  return unique.length > 0 ? unique : ["on_account"];
}

/** Clamp preferred into the allow-list (or null when unset / invalid). */
export function clampPreferredPayment(
  preferred: CorporatePreferredPayment | null | undefined,
  allowed: CorporateAllowedPayment[]
): CorporatePreferredPayment | null {
  if (!preferred) return null;
  return allowed.includes(preferred) ? preferred : null;
}

export function accountAllowsPayment(
  account: Pick<CorporateAccount, "allowedPaymentMethods">,
  method: CorporateAllowedPayment
): boolean {
  return account.allowedPaymentMethods.includes(method);
}

/** Normalize class allow-list; empty = unrestricted. */
export function normalizeAllowedVehicleClassIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const ids = raw.filter((id): id is string => typeof id === "string" && id.trim() !== "");
  return [...new Set(ids.map((id) => id.trim()))];
}

/** Whether a class is bookable under account policy (empty list = all). */
export function accountAllowsVehicleClass(
  account: Pick<CorporateAccount, "allowedVehicleClassIds"> | null | undefined,
  vehicleClassId: string
): boolean {
  if (!account) return true;
  const allowed = account.allowedVehicleClassIds;
  if (allowed.length === 0) return true;
  return allowed.includes(vehicleClassId);
}

export function formatCorporateAddress(account: CorporateAccount): string | null {
  const parts = [
    account.addressLine1,
    account.addressLine2,
    [account.city, account.state, account.postcode].filter(Boolean).join(" "),
    account.country
  ]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export function buildNewCorporateAccount(
  overrides?: Partial<CorporateAccount> & Pick<CorporateAccount, "id">
): CorporateAccount {
  const now = new Date();
  return {
    id: overrides?.id ?? crypto.randomUUID(),
    name: "",
    logoUrl: null,
    email: null,
    billingEmail: null,
    phone: null,
    abn: null,
    acn: null,
    industry: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postcode: null,
    country: null,
    primaryContactUserId: null,
    billingContactUserId: null,
    accountManagerUserId: null,
    allowedVehicleClassIds: [],
    maxRideAmount: null,
    monthlyBudget: null,
    allowedPaymentMethods: ["on_account"],
    preferredPayment: "on_account",
    gstInclusive: true,
    status: "active",
    billingDay: "last",
    paymentTermsDays: 0,
    rateMode: "percentOff",
    percentOff: 0.1,
    fixedRates: [],
    joinCode: null,
    creditLimit: null,
    stripeCustomerId: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

export const corporateAccountStatusTitle: Record<CorporateAccountStatus, string> = {
  active: "Active",
  suspended: "Suspended"
};

export const corporateRateModeTitle: Record<CorporateRateMode, string> = {
  percentOff: "Percent off retail",
  fixedRates: "Fixed class rates"
};

export const corporatePreferredPaymentTitle: Record<CorporatePreferredPayment, string> = {
  card: "Pay by card",
  on_account: "Bill to account"
};

export const corporateAllowedPaymentTitle = corporatePreferredPaymentTitle;
