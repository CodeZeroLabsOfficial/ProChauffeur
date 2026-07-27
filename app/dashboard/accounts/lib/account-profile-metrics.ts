import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";

export function tripsForCorporateAccount(
  trips: Trip[],
  accountId: string,
  memberCustomerIds: Set<string>
): Trip[] {
  return trips.filter(
    (t) =>
      t.corporateAccountId === accountId ||
      (t.customerID ? memberCustomerIds.has(t.customerID) : false)
  );
}

export function invoicesForCorporateAccount(
  invoices: Invoice[],
  accountId: string,
  memberCustomerIds: Set<string>
): Invoice[] {
  return invoices.filter(
    (inv) =>
      inv.corporateAccountId === accountId ||
      (inv.customerID ? memberCustomerIds.has(inv.customerID) : false)
  );
}
