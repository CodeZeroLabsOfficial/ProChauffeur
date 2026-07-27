"use client";

import type { Invoice } from "@/lib/models/invoice";
import type { Trip } from "@/lib/models";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { ProfileBookingActivityChart } from "@/components/profile/profile-booking-activity-chart";
import { ProfileBookingsCard } from "@/components/profile/profile-bookings-card";
import { ProfileRevenueStat } from "@/components/profile/profile-revenue-stat";

export function CustomerProfileOverviewTab({
  trips,
  invoices,
  customerId,
  period,
  onPeriodChange
}: {
  trips: Trip[];
  invoices: Invoice[];
  customerId: string;
  period: ProfileOverviewPeriod;
  onPeriodChange: (period: ProfileOverviewPeriod) => void;
}) {
  return (
    <div className="space-y-4">
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
  );
}
