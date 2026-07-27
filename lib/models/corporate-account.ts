import type { TripType } from "@/lib/models/enums";
import type { HourlyPricingRates, TransferPricingRates } from "@/lib/models/pricing";

export const CORPORATE_ACCOUNT_STATUSES = ["active", "suspended"] as const;
export type CorporateAccountStatus = (typeof CORPORATE_ACCOUNT_STATUSES)[number];

export const CORPORATE_RATE_MODES = ["percentOff", "fixedRates"] as const;
export type CorporateRateMode = (typeof CORPORATE_RATE_MODES)[number];

export const CORPORATE_PREFERRED_PAYMENTS = ["card", "on_account"] as const;
export type CorporatePreferredPayment = (typeof CORPORATE_PREFERRED_PAYMENTS)[number];

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
 */
export interface CorporateAccount {
  id: string;
  name: string;
  /** Company logo / avatar URL in Storage. */
  logoUrl?: string | null;
  /** Company contact email (not billing contact). */
  email?: string | null;
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
  /** Preferred vehicle class ids for members booking under this account. */
  defaultVehicleClassIds: string[];
  /** Quote total above this requires admin approval before dispatch. */
  maxRideAmount?: number | null;
  /** Calendar-month on-account spend cap; null = unlimited. */
  monthlyBudget?: number | null;
  /** Account default payment hint for booking UI. */
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
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function normalizeCorporateJoinCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
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
    defaultVehicleClassIds: [],
    maxRideAmount: null,
    monthlyBudget: null,
    preferredPayment: null,
    gstInclusive: true,
    status: "active",
    billingDay: "last",
    paymentTermsDays: 0,
    rateMode: "percentOff",
    percentOff: 0.1,
    fixedRates: [],
    joinCode: null,
    creditLimit: null,
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
  card: "Card",
  on_account: "Bill to company"
};
