"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";

import { InvoiceDetailSheet } from "@/app/dashboard/billing/invoice-detail-sheet";
import { invoiceStatusStyle } from "@/app/dashboard/billing/lib/invoice-actions";
import { BillingStatCard } from "@/components/billing-stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  INVOICE_STATUSES,
  invoiceStatusTitle,
  type Invoice,
  type InvoiceStatus
} from "@/lib/models";
import { cn } from "@/lib/utils";

export function AccountInvoicesTab({
  invoices,
  loading
}: {
  invoices: Invoice[];
  loading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      if (!q) return true;
      return [invoice.invoiceNumber, invoice.customerName, invoice.customerEmail]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q));
    });
  }, [invoices, search, statusFilter]);

  const outstanding = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.status === "sent" || invoice.status === "overdue")
        .reduce((sum, invoice) => sum + invoice.total, 0),
    [invoices]
  );

  const paidTotal = useMemo(
    () =>
      invoices
        .filter((invoice) => invoice.status === "paid")
        .reduce((sum, invoice) => sum + invoice.total, 0),
    [invoices]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <BillingStatCard label="Outstanding" value={formatCurrency(outstanding)} />
        <BillingStatCard label="Paid (all time)" value={formatCurrency(paidTotal)} />
        <BillingStatCard label="Invoices" value={invoices.length} />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search invoice or customer…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as InvoiceStatus | "all")}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {INVOICE_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {invoiceStatusTitle[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    Loading invoices…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-10 text-center">
                    No invoices for this account.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected(invoice);
                      setDetailOpen(true);
                    }}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.issuedAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.dueAt ?? null)}
                    </TableCell>
                    <TableCell>{formatCurrency(invoice.total, invoice.currencyCode)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn("font-medium", invoiceStatusStyle[invoice.status])}>
                        {invoiceStatusTitle[invoice.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InvoiceDetailSheet invoice={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
