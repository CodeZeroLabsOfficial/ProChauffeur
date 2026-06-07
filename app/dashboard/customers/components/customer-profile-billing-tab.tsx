"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ReceiptIcon } from "lucide-react";

import { invoiceStatusTitle, type Invoice, type InvoiceStatus } from "@/lib/models";
import { formatCurrency, formatDate } from "@/lib/format";
import { paidRevenueForInvoices } from "@/app/dashboard/drivers/lib/driver-profile-metrics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const statusStyle: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  paid: "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  void: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  overdue: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
};

export function CustomerProfileBillingTab({ invoices }: { invoices: Invoice[] }) {
  const paid = useMemo(
    () => paidRevenueForInvoices(invoices.filter((i) => i.status === "paid")),
    [invoices]
  );
  const outstanding = useMemo(
    () =>
      invoices
        .filter((i) => i.status === "sent" || i.status === "overdue")
        .reduce((sum, i) => sum + i.total, 0),
    [invoices]
  );

  const sorted = useMemo(
    () => [...invoices].sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime()),
    [invoices]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Paid</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Outstanding</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Invoices</p>
            <p className="text-2xl font-bold tabular-nums">{invoices.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {sorted.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      <Link href="/dashboard/billing" className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border", statusStyle[inv.status])}>
                        {invoiceStatusTitle[inv.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(inv.issuedAt)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(inv.total, inv.currencyCode)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className="border-0 py-12 md:py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ReceiptIcon />
                </EmptyMedia>
                <EmptyTitle className="text-xl">No Billing Yet</EmptyTitle>
                <EmptyDescription>
                  This customer doesn&apos;t have any invoices yet.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
