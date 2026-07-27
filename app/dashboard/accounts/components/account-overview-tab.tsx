"use client";

import {
  Briefcase,
  Calendar,
  IdCard,
  Mail,
  MapPin,
  PhoneCall,
  User,
  Users
} from "lucide-react";

import { ContactRow } from "@/components/contact-row";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

  const address = formatCorporateAddress(account);
  const joinDate = formatDate(account.createdAt);
  const managerName = manager ? customerDisplayName(manager) : null;
  const managerPhone = manager?.profile.phoneNumber?.trim() || null;

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-y-4">
              {joinDate ? (
                <ContactRow icon={Calendar}>Member since {joinDate}</ContactRow>
              ) : null}
              {address ? <ContactRow icon={MapPin}>{address}</ContactRow> : null}
              {account.phone?.trim() ? (
                <ContactRow icon={PhoneCall}>
                  <a
                    href={`tel:${account.phone}`}
                    className="hover:text-primary hover:underline">
                    {account.phone}
                  </a>
                </ContactRow>
              ) : null}
              {account.email?.trim() ? (
                <ContactRow icon={Mail}>
                  <a
                    href={`mailto:${account.email}`}
                    className="hover:text-primary hover:underline">
                    {account.email}
                  </a>
                </ContactRow>
              ) : null}
              {account.abn?.trim() ? (
                <ContactRow icon={IdCard}>ABN {account.abn}</ContactRow>
              ) : null}
              {account.acn?.trim() ? (
                <ContactRow icon={IdCard}>ACN {account.acn}</ContactRow>
              ) : null}
              {account.industry?.trim() ? (
                <ContactRow icon={Briefcase}>{account.industry}</ContactRow>
              ) : null}
              <ContactRow icon={Users}>{String(membersCount)} members</ContactRow>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-y-4">
              {managerName ? <ContactRow icon={User}>{managerName}</ContactRow> : null}
              {manager?.email?.trim() ? (
                <ContactRow icon={Mail}>
                  <a
                    href={`mailto:${manager.email}`}
                    className="hover:text-primary hover:underline">
                    {manager.email}
                  </a>
                </ContactRow>
              ) : null}
              {managerPhone ? (
                <ContactRow icon={PhoneCall}>
                  <a href={`tel:${managerPhone}`} className="hover:text-primary hover:underline">
                    {managerPhone}
                  </a>
                </ContactRow>
              ) : null}
              {!managerName && !manager?.email?.trim() && !managerPhone ? (
                <p className="text-muted-foreground text-sm">No account manager assigned.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-y-4">
              {account.billingContactName?.trim() ? (
                <ContactRow icon={User}>{account.billingContactName}</ContactRow>
              ) : null}
              {account.billingContactEmail?.trim() ? (
                <ContactRow icon={Mail}>
                  <a
                    href={`mailto:${account.billingContactEmail}`}
                    className="hover:text-primary hover:underline">
                    {account.billingContactEmail}
                  </a>
                </ContactRow>
              ) : null}
              {account.billingContactPhone?.trim() ? (
                <ContactRow icon={PhoneCall}>
                  <a
                    href={`tel:${account.billingContactPhone}`}
                    className="hover:text-primary hover:underline">
                    {account.billingContactPhone}
                  </a>
                </ContactRow>
              ) : null}
              {!account.billingContactName?.trim() &&
              !account.billingContactEmail?.trim() &&
              !account.billingContactPhone?.trim() ? (
                <p className="text-muted-foreground text-sm">No billing contact set.</p>
              ) : null}
            </div>
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
