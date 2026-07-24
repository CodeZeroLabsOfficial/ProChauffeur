import type { InvoiceStatus } from "@/lib/models";

export const invoiceStatusStyle: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  paid: "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  void: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  overdue: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
};

/** Statuses available when creating a new invoice. */
export const NEW_INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "void"];
