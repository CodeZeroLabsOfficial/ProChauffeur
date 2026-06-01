"use client";

import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";

import { useInvoices } from "@/hooks/use-collections";
import { INVOICE_STATUSES, invoiceStatusTitle, type Invoice, type InvoiceStatus } from "@/lib/models";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { InvoiceEditSheet } from "@/app/dashboard/billing/invoice-edit-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const statusStyle: Record<InvoiceStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
  paid: "border-green-300 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  void: "border-zinc-300 bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
  overdue: "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
};

export default function BillingPage() {
  const { invoices, loading } = useInvoices();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      return [i.invoiceNumber, i.customerName, i.customerEmail]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
    });
  }, [invoices, search, statusFilter]);

  const outstanding = useMemo(
    () =>
      invoices
        .filter((i) => i.status === "sent" || i.status === "overdue")
        .reduce((sum, i) => sum + i.total, 0),
    [invoices]
  );

  function openInvoice(inv: Invoice | null) {
    setSelected(inv);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Billing"
        description="Manage invoices and track outstanding revenue."
        actions={
          <Button onClick={() => openInvoice(null)}>
            <PlusIcon /> New invoice
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Outstanding</p>
            <p className="text-2xl font-bold">{formatCurrency(outstanding)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Paid (all time)</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0)
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Invoices</p>
            <p className="text-2xl font-bold">{invoices.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search invoice no. or customer…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}>
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {INVOICE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {invoiceStatusTitle[s]}
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
                    No invoices found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => openInvoice(i)}>
                    <TableCell className="font-medium">{i.invoiceNumber}</TableCell>
                    <TableCell>{i.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(i.issuedAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(i.dueAt ?? null)}</TableCell>
                    <TableCell>{formatCurrency(i.total, i.currencyCode)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-medium", statusStyle[i.status])}>
                        {invoiceStatusTitle[i.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <InvoiceEditSheet invoice={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
