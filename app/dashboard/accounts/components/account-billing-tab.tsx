"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";

import { AccountInvoicesTab } from "@/app/dashboard/accounts/components/account-invoices-tab";
import { BillingStatCard } from "@/components/billing-stat-card";
import { TripStatusBadge } from "@/components/trip-status-badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { shortBookingId } from "@/lib/bookings/booking-display";
import { sumTripQuotedTotals, unbilledCorporateTrips } from "@/lib/bookings/corporate-billing";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  TRIP_STATUSES,
  tripStatusTitle,
  type CorporateAccount,
  type Invoice,
  type Trip,
  type TripStatus
} from "@/lib/models";
import { generateCorporatePeriodInvoice } from "@/lib/services/payment-service";

type BillingSection = "unbilled" | "invoices";

const UNBILLED_STATUS_OPTIONS = TRIP_STATUSES.filter((status) => status !== "cancelled");

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");

  const unbilled = useMemo(
    () => unbilledCorporateTrips(trips, account.id),
    [trips, account.id]
  );
  const filteredUnbilled = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unbilled.filter((trip) => {
      if (statusFilter !== "all" && trip.status !== statusFilter) return false;
      if (!q) return true;
      return [
        trip.id,
        shortBookingId(trip.id),
        trip.customer.displayName,
        formatDateTime(trip.journey.scheduledPickupAt ?? trip.createdAt)
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [unbilled, search, statusFilter]);
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
          <BillingStatCard label="Yet to invoice" value={formatCurrency(unbilledTotal)} />
          <BillingStatCard label="Unbilled trips" value={unbilled.length} />
          <BillingStatCard
            label={budget != null ? "Budget remaining" : "Monthly budget"}
            value={
              budgetRemaining != null
                ? formatCurrency(budgetRemaining)
                : budget != null
                  ? formatCurrency(budget)
                  : "—"
            }
          />
        </div>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  placeholder="Search booking or customer…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as TripStatus | "all")}>
                <SelectTrigger className="sm:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {UNBILLED_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tripStatusTitle[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                ) : filteredUnbilled.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                      No trips match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUnbilled.map((trip) => (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/bookings/${trip.id}`}
                          className="underline-offset-4 hover:underline">
                          {shortBookingId(trip.id)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(trip.journey.scheduledPickupAt ?? trip.createdAt)}
                      </TableCell>
                      <TableCell>{trip.customer.displayName?.trim() || "—"}</TableCell>
                      <TableCell>
                        <TripStatusBadge status={trip.status} />
                      </TableCell>
                      <TableCell>
                        {trip.quote.quotedTotal != null
                          ? formatCurrency(
                              trip.quote.quotedTotal,
                              trip.quote.quotedCurrencyCode ?? undefined
                            )
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
