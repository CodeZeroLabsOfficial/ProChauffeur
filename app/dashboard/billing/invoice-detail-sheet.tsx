"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarCheck,
  CalendarClock,
  CreditCard,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

import {
  formatPostalAddress,
  postalAddressFromProfile,
  postalAddressFromTripSnapshot
} from "@/lib/models/postal-address";
import {
  invoiceStatusTitle,
  type Invoice,
  type SavedPaymentMethod,
  type Trip,
  type User
} from "@/lib/models";
import { invoiceStatusStyle } from "@/app/dashboard/billing/lib/invoice-actions";
import { LabeledDetailValue, SectionHeading } from "@/components/detail-sheet-fields";
import { formatCurrency, formatDate } from "@/lib/format";
import { fetchDefaultSavedPaymentMethod } from "@/lib/services/firebase-service";
import { useSheetDisplayItem } from "@/hooks/use-sheet-display-item";
import { useTrips, useUsers } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

function cardPaymentLabel(method: SavedPaymentMethod): string {
  if (method.displayLabel.trim()) return method.displayLabel.trim();
  const brand = method.brand.trim()
    ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1).toLowerCase()
    : "Card";
  return method.last4 ? `${brand} ending in ${method.last4}` : brand;
}

function SummaryRow({
  label,
  value,
  className
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-4 text-sm", className)}>
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span className="shrink-0 text-right">{value}</span>
    </div>
  );
}

function InvoiceDetailBody({
  invoice,
  trip,
  customer,
  paymentMethod
}: {
  invoice: Invoice;
  trip: Trip | undefined;
  customer: User | undefined;
  paymentMethod: SavedPaymentMethod | null | undefined;
}) {
  const isPaid = invoice.status === "paid";
  const name = invoice.customerName.trim() || customer?.profile.displayName.trim() || "—";
  const email = invoice.customerEmail?.trim() || customer?.email?.trim() || null;
  const phone =
    invoice.customerPhone?.trim() || customer?.profile.phoneNumber?.trim() || null;
  const address =
    formatPostalAddress(trip ? postalAddressFromTripSnapshot(trip) : null) ||
    formatPostalAddress(customer ? postalAddressFromProfile(customer.profile) : null) ||
    null;

  const lineItems = invoice.lineItems?.filter((l) => l.label.trim() || l.amount) ?? [];

  const paymentLabel =
    paymentMethod === undefined
      ? "…"
      : paymentMethod
        ? cardPaymentLabel(paymentMethod)
        : "No card on file";

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4">
        <LabeledDetailValue
          icon={Calendar}
          label="Date issued"
          value={formatDate(invoice.issuedAt)}
        />
        {isPaid ? (
          <LabeledDetailValue
            icon={CalendarCheck}
            label="Date paid"
            value={formatDate(invoice.paidAt ?? null)}
          />
        ) : (
          <LabeledDetailValue
            icon={CalendarClock}
            label="Date due"
            value={formatDate(invoice.dueAt ?? null)}
          />
        )}
      </dl>

      <div className="space-y-3">
        <SectionHeading>Bill to</SectionHeading>
        <div className="space-y-2 text-sm">
          <p className="text-foreground font-medium">{name}</p>
          {address ? <p className="text-foreground">{address}</p> : null}
          {phone ? (
            <p className="text-foreground">
              <a href={`tel:${phone}`} className="hover:underline">
                {phone}
              </a>
            </p>
          ) : null}
          {email ? (
            <p className="text-foreground">
              <a href={`mailto:${email}`} className="hover:underline">
                {email}
              </a>
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeading>Invoice summary</SectionHeading>
        {lineItems.length > 0 ? (
          <div className="space-y-3">
            {lineItems.map((line) => (
              <SummaryRow
                key={line.id}
                label={line.label.trim() || "Item"}
                value={formatCurrency(line.amount, invoice.currencyCode)}
              />
            ))}
          </div>
        ) : null}
        <div className="space-y-4">
          <SummaryRow
            label="Subtotal"
            value={formatCurrency(invoice.subtotal, invoice.currencyCode)}
          />
          <SummaryRow
            label="GST"
            value={formatCurrency(invoice.taxAmount, invoice.currencyCode)}
          />
          <Separator />
          <SummaryRow
            label="Total"
            value={formatCurrency(invoice.total, invoice.currencyCode)}
            className="font-semibold [&_span]:text-foreground"
          />
        </div>
      </div>

      <div className="bg-muted flex items-center justify-between rounded-md border p-4">
        <div className="space-y-1">
          <h4 className="font-medium">Payment method</h4>
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <CreditCard className="size-4 shrink-0" />
            <span>{paymentLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={invoice.status !== "paid"}
          onClick={() => toast.message("Refunds are not available yet.")}>
          Refund
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() => toast.message("Sending receipts is not available yet.")}>
          Send receipt
        </Button>
      </div>
    </div>
  );
}

export function InvoiceDetailSheet({
  invoice,
  open,
  onOpenChange
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const displayInvoice = useSheetDisplayItem(invoice, open);
  const { trips } = useTrips();
  const { users } = useUsers();
  const [paymentMethod, setPaymentMethod] = useState<SavedPaymentMethod | null | undefined>(
    undefined
  );

  const trip = useMemo(() => {
    if (!displayInvoice?.tripIDs?.length) return undefined;
    const id = displayInvoice.tripIDs[0];
    return trips.find((t) => t.id === id);
  }, [displayInvoice?.tripIDs, trips]);

  const customer = useMemo(() => {
    if (!displayInvoice?.customerID) return undefined;
    return users.find((u) => u.id === displayInvoice.customerID);
  }, [displayInvoice?.customerID, users]);

  useEffect(() => {
    if (!open || !displayInvoice?.customerID) {
      setPaymentMethod(undefined);
      return;
    }

    let cancelled = false;
    setPaymentMethod(undefined);
    void fetchDefaultSavedPaymentMethod(displayInvoice.customerID).then((method) => {
      if (!cancelled) setPaymentMethod(method);
    });

    return () => {
      cancelled = true;
    };
  }, [open, displayInvoice?.customerID]);

  if (!displayInvoice) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="overflow-y-auto sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <SheetHeader>
          <div className="flex flex-wrap items-start justify-between gap-2 pe-6">
            <div className="space-y-2">
              <SheetTitle>Invoice {displayInvoice.invoiceNumber}</SheetTitle>
              <Badge
                variant="outline"
                className={cn("font-medium", invoiceStatusStyle[displayInvoice.status])}>
                {invoiceStatusTitle[displayInvoice.status]}
              </Badge>
            </div>
            {displayInvoice.stripeHostedInvoiceUrl ? (
              <Button variant="outline" asChild>
                <a
                  href={displayInvoice.stripeHostedInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer">
                  <ExternalLink />
                  View invoice
                </a>
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <InvoiceDetailBody
            invoice={displayInvoice}
            trip={trip}
            customer={customer}
            paymentMethod={paymentMethod}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
