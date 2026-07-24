"use client";

import { useEffect, useState } from "react";
import { ExternalLinkIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { createInvoice, fetchOperatorLocale, updateInvoice } from "@/lib/services/firebase-service";
import {
  computeInvoiceTotals,
  invoiceStatusTitle,
  type Invoice,
  type InvoiceLineItem,
  type InvoiceStatus
} from "@/lib/models";
import {
  allowedInvoiceStatuses,
  canEditInvoice
} from "@/app/dashboard/billing/lib/invoice-actions";
import { appConfig } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

function newLine(): InvoiceLineItem {
  return { id: crypto.randomUUID(), label: "", amount: 0 };
}

export function InvoiceEditSheet({
  invoice,
  open,
  onOpenChange
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isNew = !invoice;
  const isReadOnly = !isNew && !canEditInvoice(invoice.status);
  const statusOptions = allowedInvoiceStatuses(invoice?.status ?? null, isNew);
  const isStripe = Boolean(invoice?.stripeInvoiceId || invoice?.stripeHostedInvoiceUrl);

  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? "draft");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    invoice?.lineItems?.length ? invoice.lineItems : [newLine()]
  );
  const [taxRate, setTaxRate] = useState(invoice ? invoice.taxRate * 100 : 10);
  const [currencyCode, setCurrencyCode] = useState(invoice?.currencyCode ?? "AUD");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || invoice) return;
    fetchOperatorLocale()
      .then((locale) => {
        setTaxRate(locale.defaultTaxRate * 100);
        setCurrencyCode(locale.currency);
      })
      .catch(() => {
        // Invoice can still be created manually when locale is not configured.
      });
  }, [open, invoice]);

  const [seededId, setSeededId] = useState<string>("__init__");
  const key = invoice?.id ?? "__new__";
  if (key !== seededId) {
    setSeededId(key);
    setStatus(invoice?.status ?? "draft");
    setLineItems(invoice?.lineItems?.length ? invoice.lineItems : [newLine()]);
    setTaxRate(invoice ? invoice.taxRate * 100 : 10);
  }

  const totals = computeInvoiceTotals(lineItems, taxRate / 100);

  function updateLine(id: string, patch: Partial<InvoiceLineItem>) {
    if (isReadOnly) return;
    setLineItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isReadOnly) return;

    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "").trim();
    const cleanLines = lineItems.filter((l) => l.label.trim() || l.amount);
    const { subtotal, taxAmount, total } = computeInvoiceTotals(cleanLines, taxRate / 100);

    const payload = {
      invoiceNumber: get("invoiceNumber") || `INV-${Date.now().toString().slice(-6)}`,
      customerID: invoice?.customerID || get("customerName"),
      customerName: get("customerName"),
      customerEmail: get("customerEmail") || null,
      customerPhone: get("customerPhone") || null,
      tripIDs: invoice?.tripIDs ?? [],
      status,
      currencyCode: invoice?.currencyCode ?? currencyCode,
      lineItems: cleanLines,
      subtotal,
      taxRate: taxRate / 100,
      taxAmount,
      total,
      issuedAt: get("issuedAt") ? new Date(get("issuedAt")) : new Date(),
      dueAt: get("dueAt") ? new Date(get("dueAt")) : null,
      paidAt: status === "paid" ? (invoice?.paidAt ?? new Date()) : null,
      notes: get("notes") || null
    };

    setSaving(true);
    try {
      if (isNew) {
        await createInvoice(payload);
        toast.success("Invoice created.");
      } else {
        await updateInvoice(invoice!.id, payload);
        toast.success("Invoice updated.");
      }
      onOpenChange(false);
    } catch {
      toast.error("Could not save the invoice.");
    } finally {
      setSaving(false);
    }
  }

  const title = isNew
    ? "New invoice"
    : isReadOnly
      ? `Invoice ${invoice.invoiceNumber}`
      : `Edit invoice ${invoice.invoiceNumber}`;

  const description = isReadOnly
    ? invoice.status === "paid"
      ? "This invoice has been paid and can no longer be edited."
      : "This invoice has been voided and can no longer be edited."
    : `Amounts are in ${appConfig.currency}.`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
          {(isStripe || invoice?.stripeHostedInvoiceUrl) && (
            <div className="flex flex-wrap items-center gap-2 px-0 pt-1">
              {isStripe && (
                <Badge variant="outline" className="font-medium">
                  Stripe
                </Badge>
              )}
              {invoice?.stripeHostedInvoiceUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={invoice.stripeHostedInvoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer">
                    <ExternalLinkIcon />
                    View hosted invoice
                  </a>
                </Button>
              )}
            </div>
          )}
        </SheetHeader>
        <form onSubmit={onSubmit} className="space-y-4 px-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice no.</Label>
              <Input
                id="invoiceNumber"
                name="invoiceNumber"
                defaultValue={invoice?.invoiceNumber}
                placeholder="Auto"
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              {isReadOnly ? (
                <div className="flex h-9 items-center">
                  <Badge variant="outline" className="font-medium">
                    {invoiceStatusTitle[invoice.status]}
                  </Badge>
                  {invoice.status === "paid" && invoice.paidAt && (
                    <span className="text-muted-foreground ml-2 text-sm">
                      {formatDate(invoice.paidAt)}
                    </span>
                  )}
                </div>
              ) : (
                <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {invoiceStatusTitle[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerName">Customer</Label>
            <Input
              id="customerName"
              name="customerName"
              required={!isReadOnly}
              defaultValue={invoice?.customerName}
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                defaultValue={invoice?.customerEmail ?? ""}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerPhone">Phone</Label>
              <Input
                id="customerPhone"
                name="customerPhone"
                defaultValue={invoice?.customerPhone ?? ""}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Line items</Label>
            <div className="space-y-2">
              {lineItems.map((line) => (
                <div key={line.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Description"
                    value={line.label}
                    onChange={(e) => updateLine(line.id, { label: e.target.value })}
                    disabled={isReadOnly}
                  />
                  <Input
                    className="w-32"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={line.amount || ""}
                    onChange={(e) => updateLine(line.id, { amount: parseFloat(e.target.value) || 0 })}
                    disabled={isReadOnly}
                  />
                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLineItems((r) => r.filter((x) => x.id !== line.id))}>
                      <Trash2Icon className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLineItems((r) => [...r, newLine()])}>
                <PlusIcon /> Add line
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="taxRatePct">Tax rate (%)</Label>
              <Input
                id="taxRatePct"
                type="number"
                step="0.1"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
              />
            </div>
            <div className="flex flex-col justify-end gap-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(totals.taxAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="issuedAt">Issued</Label>
              <Input
                id="issuedAt"
                name="issuedAt"
                type="date"
                defaultValue={(invoice?.issuedAt ?? new Date()).toISOString().slice(0, 10)}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueAt">Due</Label>
              <Input
                id="dueAt"
                name="dueAt"
                type="date"
                defaultValue={invoice?.dueAt ? invoice.dueAt.toISOString().slice(0, 10) : ""}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={invoice?.notes ?? ""}
              disabled={isReadOnly}
            />
          </div>

          <SheetFooter className="px-0">
            {isReadOnly ? (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : isNew ? "Create invoice" : "Save changes"}
              </Button>
            )}
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
