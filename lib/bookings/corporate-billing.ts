import type { CorporateAccount, User } from "@/lib/models";

/**
 * Invoice / Stripe email for a corporate account.
 * Prefer accounts inbox, then company email, then billing contact.
 */
export function resolveCorporateInvoiceEmail(
  account: Pick<CorporateAccount, "billingEmail" | "email">,
  billingContact?: Pick<User, "email"> | null
): string | null {
  const billingEmail = account.billingEmail?.trim();
  if (billingEmail) return billingEmail;
  const companyEmail = account.email?.trim();
  if (companyEmail) return companyEmail;
  const contactEmail = billingContact?.email?.trim();
  if (contactEmail) return contactEmail;
  return null;
}
