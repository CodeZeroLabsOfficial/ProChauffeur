"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProfileBookingActivityChart } from "@/components/profile/profile-booking-activity-chart";
import { ProfileBookingsCard } from "@/components/profile/profile-bookings-card";
import { ProfileRevenueStat } from "@/components/profile/profile-revenue-stat";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  formatCorporateAddress,
  type CorporateAccount,
  type User
} from "@/lib/models";
import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models/trip";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { customerDisplayName } from "@/lib/users/customer-display";

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

  const primaryContactSummary = [
    account.primaryContactName,
    account.primaryContactEmail,
    account.primaryContactPhone
  ]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Company</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Company name" value={account.name} />
            <Row label="Address" value={formatCorporateAddress(account)} />
            <Row label="Phone" value={account.phone} />
            <Row label="Email" value={account.email} />
            <Row label="ABN" value={account.abn} />
            <Row label="ACN" value={account.acn} />
            <Row label="Industry" value={account.industry} />
            <Row label="Members" value={String(membersCount)} />
            <Row label="Primary contact" value={primaryContactSummary || null} />
            <Row label="Join date" value={formatDate(account.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Manager</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={manager ? customerDisplayName(manager) : null} />
            <Row label="Email" value={manager?.email} />
            <Row label="Phone" value={manager?.profile.phoneNumber} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Name" value={account.billingContactName} />
            <Row label="Email" value={account.billingContactEmail} />
            <Row label="Phone" value={account.billingContactPhone} />
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
