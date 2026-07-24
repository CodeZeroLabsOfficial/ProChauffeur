"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarClock,
  CreditCard,
  ExternalLink,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  User as UserIcon
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
import { DetailLabel, LabeledDetailValue, SectionHeading } from "@/components/detail-sheet-fields";
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

function InvoiceDetailBody({
  invoice,
  trip,
  customer,
  paymentMethod,
  onOpenChange
}: {
  invoice: Invoice;
  trip: Trip | undefined;
  customer: User | undefined;
  paymentMethod: SavedPaymentMethod | null | undefined;
  onOpenChange: (open: boolean) => void;
}) {
  const name = invoice.customerName.trim() || customer?.profile.displayName.trim() || "—";
  const email = invoice.customerEmail?.trim() || customer?.email?.trim() || null;
  const phone =
    invoice.customerPhone?.trim() || customer?.profile.phoneNumber?.trim() || null;
  const address =
    formatPostalAddress(trip ? postalAddressFromTripSnapshot(trip) : null) ||
    formatPostalAddress(customer ? postalAddressFromProfile(customer.profile) : null) ||
    null;

  const bookingCount = invoice.tripIDs?.length ?? 0;
  const singleTripId = bookingCount === 1 ? invoice.tripIDs[0] : null;

  const paymentLabel =
    paymentMethod === undefined
      ? "…"
      : paymentMethod
        ? cardPaymentLabel(paymentMethod)
        : "No card on file";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SectionHeading>Customer details</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <LabeledDetailValue icon={UserIcon} label="Name" value={name} />
          <LabeledDetailValue icon={MapPin} label="Address" value={address} />
          <LabeledDetailValue
            icon={Mail}
            label="Email"
            value={email}
            href={email ? `mailto:${email}` : undefined}
          />
          <LabeledDetailValue
            icon={Phone}
            label="Phone"
            value={phone}
            href={phone ? `tel:${phone}` : undefined}
          />
        </dl>
      </div>

      <div className="space-y-4">
        <SectionHeading>Invoice summary</SectionHeading>
        <dl className="grid grid-cols-2 gap-4">
          <LabeledDetailValue
            icon={Calendar}
            label="Issued"
            value={formatDate(invoice.issuedAt)}
          />
          <LabeledDetailValue
            icon={CalendarClock}
            label="Due"
            value={formatDate(invoice.dueAt ?? null)}
          />
          <div className="space-y-1">
            <DetailLabel icon={ListChecks}>Bookings</DetailLabel>
            <dd>
              {singleTripId ? (
                <Link
                  href={`/dashboard/bookings/${singleTripId}`}
                  className="text-foreground text-sm underline-offset-4 hover:underline"
                  onClick={() => onOpenChange(false)}>
                  1 booking
                </Link>
              ) : (
                <p className="text-foreground text-sm">{bookingCount}</p>
              )}
            </dd>
          </div>
        </dl>
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(invoice.subtotal, invoice.currencyCode)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>{formatCurrency(invoice.taxAmount, invoice.currencyCode)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span>Total</span>
            <span>{formatCurrency(invoice.total, invoice.currencyCode)}</span>
          </div>
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
            onOpenChange={onOpenChange}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
