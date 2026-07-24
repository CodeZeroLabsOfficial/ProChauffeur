import type { InvoiceStatus } from "@/lib/models";

/** Paid and void invoices are immutable (body + status). */
export function canEditInvoice(status: InvoiceStatus): boolean {
  return status !== "paid" && status !== "void";
}

/**
 * Statuses an operator may set from the current state.
 * Paid/void are terminal — callers should not show a status select.
 */
export function allowedInvoiceStatuses(
  current: InvoiceStatus | null,
  isNew: boolean
): InvoiceStatus[] {
  if (isNew || current === "draft") {
    return ["draft", "sent", "paid", "void"];
  }
  if (current === "sent") {
    return ["sent", "paid", "void", "overdue"];
  }
  if (current === "overdue") {
    return ["overdue", "paid", "void"];
  }
  return current ? [current] : ["draft"];
}
