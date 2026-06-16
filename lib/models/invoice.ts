import type { InvoiceStatus, PaymentSource } from "@/lib/models/enums";

/** A single labelled charge on an invoice (shape mirrors TripQuote line items). */
export interface InvoiceLineItem {
  id: string;
  label: string;
  amount: number;
}

/**
 * Invoice — `invoices/{id}` document. Web-defined (no iOS equivalent).
 * Links billing to one or more trips and a customer.
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerID: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  tripIDs: string[];
  status: InvoiceStatus;
  currencyCode: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  issuedAt: Date;
  dueAt?: Date | null;
  paidAt?: Date | null;
  notes?: string | null;
  source?: PaymentSource | null;
  stripeInvoiceId?: string | null;
  stripeHostedInvoiceUrl?: string | null;
  stripePaymentIntentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function computeInvoiceTotals(
  lineItems: InvoiceLineItem[],
  taxRate: number
): { subtotal: number; taxAmount: number; total: number } {
  const subtotal = lineItems.reduce((sum, li) => sum + (Number.isFinite(li.amount) ? li.amount : 0), 0);
  const taxAmount = subtotal * taxRate;
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}
