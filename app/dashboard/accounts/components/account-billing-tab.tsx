"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { TripStatusBadge } from "@/components/trip-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { shortBookingId } from "@/lib/bookings/booking-display";
import {
  formatCorporateBillingDay,
  resolveCorporateInvoiceEmail,
  sumTripQuotedTotals,
  unbilledCorporateTrips
} from "@/lib/bookings/corporate-billing";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { CorporateAccount, Trip } from "@/lib/models";
import { generateCorporatePeriodInvoice } from "@/lib/services/payment-service";

export function AccountBillingTab({
  account,
  trips
}: {
  account: CorporateAccount;
  trips: Trip[];
}) {
  const [generating, setGenerating] = useState(false);

  const unbilled = useMemo(
    () => unbilledCorporateTrips(trips, account.id),
    [trips, account.id]
  );
  const unbilledTotal = useMemo(() => sumTripQuotedTotals(unbilled), [unbilled]);
  const invoiceEmail = useMemo(() => resolveCorporateInvoiceEmail(account), [account]);
  const budget = account.monthlyBudget;
  const budgetRemaining =
    budget != null && Number.isFinite(budget) ? Math.max(0, budget - unbilledTotal) : null;

  async function onGenerate() {
    if (unbilled.length === 0) {
      toast.message("No unbilled trips to invoice.");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateCorporatePeriodInvoice(account.id);
      if (result.invoicesCreated === 0) {
        toast.message("No invoices were created.");
      } else {
        const tripCount = result.results.reduce((sum, row) => sum + row.tripCount, 0);
        toast.success(
          result.invoicesCreated === 1
            ? `Invoice created for ${tripCount} trip${tripCount === 1 ? "" : "s"}.`
            : `${result.invoicesCreated} invoices created for ${tripCount} trips.`
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate invoice.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-muted-foreground text-sm">
            Unbilled on-account trips. Invoices run on {formatCorporateBillingDay(account.billingDay)}
            {invoiceEmail ? ` · ${invoiceEmail}` : ""}.
          </p>
        </div>
        <Button
          type="button"
          disabled={generating || unbilled.length === 0}
          onClick={() => void onGenerate()}>
          {generating ? "Generating…" : "Generate invoice"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Yet to invoice</p>
            <p className="text-2xl font-bold">{formatCurrency(unbilledTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Unbilled trips</p>
            <p className="text-2xl font-bold">{unbilled.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">
              {budget != null ? "Budget remaining" : "Monthly budget"}
            </p>
            <p className="text-2xl font-bold">
              {budgetRemaining != null
                ? formatCurrency(budgetRemaining)
                : budget != null
                  ? formatCurrency(budget)
                  : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trips to invoice</CardTitle>
          <CardDescription>
            On-account bookings not yet linked to an invoice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unbilled.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                    No unbilled trips for this account.
                  </TableCell>
                </TableRow>
              ) : (
                unbilled.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/bookings/${trip.id}`}
                        className="underline-offset-4 hover:underline">
                        {shortBookingId(trip.id)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(trip.scheduledPickupAt ?? trip.createdAt)}
                    </TableCell>
                    <TableCell>{trip.customerDisplayName?.trim() || "—"}</TableCell>
                    <TableCell>
                      <TripStatusBadge status={trip.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {trip.quotedTotal != null
                        ? formatCurrency(trip.quotedTotal, trip.quotedCurrencyCode ?? undefined)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
