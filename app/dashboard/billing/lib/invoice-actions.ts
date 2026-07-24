import type { InvoiceStatus } from "@/lib/models";

export const invoiceStatusStyle: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  paid: "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  void: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  overdue: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
};

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
