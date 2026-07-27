"use client";

import {
  Briefcase,
  Building2,
  Calendar,
  IdCard,
  Mail,
  MapPin,
  Phone,
  User,
  Users
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LabeledDetailValue } from "@/components/detail-sheet-fields";
import { ProfileBookingActivityChart } from "@/components/profile/profile-booking-activity-chart";
import { ProfileBookingsCard } from "@/components/profile/profile-bookings-card";
import { ProfileRevenueStat } from "@/components/profile/profile-revenue-stat";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  formatCorporateAddress,
  type CorporateAccount,
  type User as AccountUser
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
  manager: AccountUser | null;
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
          <CardContent>
            <dl className="space-y-3">
              <LabeledDetailValue icon={Building2} label="Company name" value={account.name} />
              <LabeledDetailValue
                icon={MapPin}
                label="Address"
                value={formatCorporateAddress(account)}
              />
              <LabeledDetailValue icon={Phone} label="Phone" value={account.phone} />
              <LabeledDetailValue icon={Mail} label="Email" value={account.email} />
              <LabeledDetailValue icon={IdCard} label="ABN" value={account.abn} />
              <LabeledDetailValue icon={IdCard} label="ACN" value={account.acn} />
              <LabeledDetailValue icon={Briefcase} label="Industry" value={account.industry} />
              <LabeledDetailValue icon={Users} label="Members" value={String(membersCount)} />
              <LabeledDetailValue
                icon={Calendar}
                label="Join date"
                value={formatDate(account.createdAt)}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <LabeledDetailValue
                icon={User}
                label="Name"
                value={manager ? customerDisplayName(manager) : null}
              />
              <LabeledDetailValue icon={Mail} label="Email" value={manager?.email} />
              <LabeledDetailValue
                icon={Phone}
                label="Phone"
                value={manager?.profile.phoneNumber}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              <LabeledDetailValue
                icon={User}
                label="Name"
                value={account.billingContactName}
              />
              <LabeledDetailValue
                icon={Mail}
                label="Email"
                value={account.billingContactEmail}
              />
              <LabeledDetailValue
                icon={Phone}
                label="Phone"
                value={account.billingContactPhone}
              />
            </dl>
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
