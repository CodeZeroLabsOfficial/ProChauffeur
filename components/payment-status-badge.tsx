import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { paymentStatusTitle, type PaymentStatus } from "@/lib/models";

const statusStyles: Record<PaymentStatus, string> = {
  unpaid: "border-slate-300 bg-slate-50 text-slate-700 dark:bg-slate-950/40 dark:text-slate-300",
  pending:
    "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  paid: "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  failed: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  invoiced:
    "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  refunded:
    "border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", statusStyles[status])}>
      {paymentStatusTitle[status]}
    </Badge>
  );
}
