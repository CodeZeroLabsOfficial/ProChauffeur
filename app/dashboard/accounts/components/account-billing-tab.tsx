"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AccountInvoicesTab } from "@/app/dashboard/accounts/components/account-invoices-tab";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { shortBookingId } from "@/lib/bookings/booking-display";
import { sumTripQuotedTotals, unbilledCorporateTrips } from "@/lib/bookings/corporate-billing";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { CorporateAccount, Invoice, Trip } from "@/lib/models";
import { generateCorporatePeriodInvoice } from "@/lib/services/payment-service";

type BillingSection = "unbilled" | "invoices";

export function AccountBillingTab({
  account,
  trips,
  invoices,
  invoicesLoading,
  defaultSection = "unbilled"
}: {
  account: CorporateAccount;
  trips: Trip[];
  invoices: Invoice[];
  invoicesLoading?: boolean;
  defaultSection?: BillingSection;
}) {
  const [section, setSection] = useState<BillingSection>(defaultSection);
  const [generating, setGenerating] = useState(false);

  const unbilled = useMemo(
    () => unbilledCorporateTrips(trips, account.id),
    [trips, account.id]
  );
  const unbilledTotal = useMemo(() => sumTripQuotedTotals(unbilled), [unbilled]);
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
        const stripeErrors = result.results.filter((row) => row.stripeError);
        const hosted = result.results.find((row) => row.hostedInvoiceUrl)?.hostedInvoiceUrl;
        toast.success(
          result.invoicesCreated === 1
            ? `Invoice created for ${tripCount} trip${tripCount === 1 ? "" : "s"}.`
            : `${result.invoicesCreated} invoices created for ${tripCount} trips.`
        );
        if (stripeErrors.length > 0) {
          toast.message(
            stripeErrors[0].stripeError ||
              "Firestore invoice saved, but Stripe email could not be sent."
          );
        } else if (hosted) {
          toast.message("Stripe invoice emailed to the accounts address.");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate invoice.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Tabs
      value={section}
      onValueChange={(value) => setSection(value as BillingSection)}
      className="gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="[&_[data-slot=tabs-trigger]]:flex-none">
          <TabsTrigger value="unbilled">Unbilled</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>
        {section === "unbilled" ? (
          <Button
            type="button"
            disabled={generating || unbilled.length === 0}
            onClick={() => void onGenerate()}>
            {generating ? "Generating…" : "Generate invoice"}
          </Button>
        ) : null}
      </div>

      <TabsContent value="unbilled" className="mt-0 space-y-4">
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Pickup</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
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
                      <TableCell>
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
      </TabsContent>

      <TabsContent value="invoices" className="mt-0">
        <AccountInvoicesTab invoices={invoices} loading={invoicesLoading} />
      </TabsContent>
    </Tabs>
  );
}
