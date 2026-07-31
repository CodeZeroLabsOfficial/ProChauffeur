"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Calendar, Mail, MapPin, PhoneCall } from "lucide-react";

import type { Invoice } from "@/lib/models/invoice";
import type { Trip, User } from "@/lib/models";
import { formatPostalAddress } from "@/lib/models/postal-address";
import { customerProfileCompleteness } from "@/app/dashboard/customers/lib/customer-profile-metrics";
import { formatDate } from "@/lib/format";
import { useFeatureEnabled } from "@/hooks/use-feature-enabled";
import { fetchCorporateAccount } from "@/lib/services/firebase-service";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { ContactRow } from "@/components/contact-row";
import { ProfileBookingActivityChart } from "@/components/profile/profile-booking-activity-chart";
import { ProfileBookingsCard } from "@/components/profile/profile-bookings-card";
import { ProfileCompletenessCard } from "@/components/profile/profile-completeness-card";
import { ProfileMiniStats } from "@/components/profile/profile-mini-stats";
import { ProfileRevenueStat } from "@/components/profile/profile-revenue-stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CustomerProfileOverviewTab({
  user,
  trips,
  invoices,
  customerId,
  statTrips,
  statCompleted,
  statSpendLabel,
  period,
  onPeriodChange
}: {
  user: User;
  trips: Trip[];
  invoices: Invoice[];
  customerId: string;
  statTrips: number;
  statCompleted: number;
  statSpendLabel: string;
  period: ProfileOverviewPeriod;
  onPeriodChange: (period: ProfileOverviewPeriod) => void;
}) {
  const progressValue = customerProfileCompleteness(user);
  const { enabled: corporateAccountsEnabled } = useFeatureEnabled("corporateAccounts");
  const [corporateAccountName, setCorporateAccountName] = useState<string | null>(null);
  const isCorporate = corporateAccountsEnabled && Boolean(user.corporateAccountId?.trim());
  const memberSince = formatDate(user.createdAt);
  const address = formatPostalAddress(user.profile.address);

  useEffect(() => {
    const accountId = user.corporateAccountId?.trim();
    if (!accountId || !corporateAccountsEnabled) {
      setCorporateAccountName(null);
      return;
    }
    let cancelled = false;
    fetchCorporateAccount(accountId)
      .then((account) => {
        if (!cancelled) setCorporateAccountName(account?.name?.trim() || null);
      })
      .catch(() => {
        if (!cancelled) setCorporateAccountName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user.corporateAccountId, corporateAccountsEnabled]);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Customer details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-y-4">
              {memberSince ? (
                <ContactRow icon={Calendar}>Member since {memberSince}</ContactRow>
              ) : null}
              <ContactRow icon={Mail}>
                <a href={`mailto:${user.email}`} className="hover:text-primary hover:underline">
                  {user.email}
                </a>
              </ContactRow>
              {user.profile.phoneNumber?.trim() ? (
                <ContactRow icon={PhoneCall}>
                  <a
                    href={`tel:${user.profile.phoneNumber}`}
                    className="hover:text-primary hover:underline">
                    {user.profile.phoneNumber}
                  </a>
                </ContactRow>
              ) : null}
              {address ? <ContactRow icon={MapPin}>{address}</ContactRow> : null}
              {isCorporate && user.corporateAccountId && corporateAccountName ? (
                <ContactRow icon={Building2}>
                  <Link
                    href={`/dashboard/accounts/${user.corporateAccountId}`}
                    className="hover:text-primary hover:underline">
                    {corporateAccountName}
                  </Link>
                </ContactRow>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <ProfileMiniStats
          items={[
            { label: "Trips", value: statTrips },
            { label: "Completed", value: statCompleted },
            { label: "Spend", value: statSpendLabel }
          ]}
        />

        <ProfileCompletenessCard value={progressValue} />
      </div>

      <div className="space-y-4 xl:col-span-2">
        <ProfileBookingActivityChart trips={trips} period={period} onPeriodChange={onPeriodChange} />
        <div className="gap-4 space-y-4 lg:grid lg:grid-cols-2 lg:space-y-0">
          <ProfileRevenueStat invoices={invoices} period={period} />
          <ProfileBookingsCard
            trips={trips}
            period={period}
            tripsHref={`/dashboard/customers/${customerId}?tab=trips`}
          />
        </div>
      </div>
    </div>
  );
}
