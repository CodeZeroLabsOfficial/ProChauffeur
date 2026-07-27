"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProfileBookingActivityChart } from "@/components/profile/profile-booking-activity-chart";
import { ProfileBookingsCard } from "@/components/profile/profile-bookings-card";
import { ProfileRevenueStat } from "@/components/profile/profile-revenue-stat";
import { formatCurrency } from "@/lib/format";
import {
  corporatePreferredPaymentTitle,
  corporateRateModeTitle,
  type CorporateAccount,
  type User
} from "@/lib/models";
import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { customerDisplayName } from "@/lib/users/customer-display";

function billingDayLabel(account: CorporateAccount): string {
  return account.billingDay === "last" ? "Last day of month" : String(account.billingDay);
}

export function AccountOverviewTab({
  account,
  manager,
  membersCount,
  mtdSpend,
  trips,
  invoices,
  period,
  onPeriodChange
}: {
  account: CorporateAccount;
  manager: User | null;
  membersCount: number;
  mtdSpend: number;
  trips: Trip[];
  invoices: Invoice[];
  period: ProfileOverviewPeriod;
  onPeriodChange: (period: ProfileOverviewPeriod) => void;
}) {
  const budget = account.monthlyBudget;
  const budgetPct =
    budget != null && budget > 0 ? Math.min(100, Math.round((mtdSpend / budget) * 100)) : null;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={account.name} />
            <Row label="ABN" value={account.abn} />
            <Row label="PO number" value={account.poNumber} />
            <Row label="Billing day" value={billingDayLabel(account)} />
            <Row label="Payment terms" value={`${account.paymentTermsDays} days`} />
            <Row label="Rate mode" value={corporateRateModeTitle[account.rateMode]} />
            <Row
              label="Preferred payment"
              value={
                account.preferredPayment
                  ? corporatePreferredPaymentTitle[account.preferredPayment]
                  : null
              }
            />
            <Row label="GST inclusive" value={account.gstInclusive ? "Yes" : "No"} />
            <Row label="Notes" value={account.notes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Primary" value={account.primaryContactName} />
            <Row label="Primary email" value={account.primaryContactEmail} />
            <Row label="Primary phone" value={account.primaryContactPhone} />
            <Row label="Billing" value={account.billingContactName} />
            <Row label="Billing email" value={account.billingContactEmail ?? account.billingEmail} />
            <Row label="Billing phone" value={account.billingContactPhone ?? account.billingPhone} />
            <Row label="Account manager" value={manager ? customerDisplayName(manager) : null} />
            <Row label="Members" value={String(membersCount)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly spend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="tabular-nums font-medium">{formatCurrency(mtdSpend)}</span>
              <span className="text-muted-foreground">
                {budget != null ? `of ${formatCurrency(budget)}` : "No monthly budget"}
              </span>
            </div>
            {budgetPct != null ? <Progress value={budgetPct} /> : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:col-span-2">
        <ProfileBookingActivityChart
          trips={trips}
          period={period}
          onPeriodChange={onPeriodChange}
        />
        <div className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
          <ProfileRevenueStat invoices={invoices} period={period} />
          <ProfileBookingsCard
            trips={trips}
            period={period}
            tripsHref="/dashboard/bookings"
            tripsLinkLabel="Bookings"
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium wrap-break-word">{value?.trim() || "—"}</p>
    </div>
  );
}
