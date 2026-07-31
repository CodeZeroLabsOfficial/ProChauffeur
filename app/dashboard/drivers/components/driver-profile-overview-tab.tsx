"use client";

import { Calendar, Mail, MapPin, PhoneCall } from "lucide-react";

import type { Invoice } from "@/lib/models/invoice";
import type { BranchDriver, Trip, User } from "@/lib/models";
import { branchDriverToProfile } from "@/app/dashboard/drivers/lib/roster-chauffeurs";
import { formatPostalAddress } from "@/lib/models/postal-address";
import { driverProfileCompleteness } from "@/app/dashboard/drivers/lib/driver-profile-metrics";
import { formatDate } from "@/lib/format";
import type { ProfileOverviewPeriod } from "@/lib/profile/overview-period";
import { ContactRow } from "@/components/contact-row";
import { ProfileBookingActivityChart } from "@/components/profile/profile-booking-activity-chart";
import { ProfileBookingsCard } from "@/components/profile/profile-bookings-card";
import { ProfileCompletenessCard } from "@/components/profile/profile-completeness-card";
import { ProfileMiniStats } from "@/components/profile/profile-mini-stats";
import { ProfileRevenueStat } from "@/components/profile/profile-revenue-stat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DriverProfileOverviewTab({
  user,
  roster,
  trips,
  invoices,
  driverId,
  statTrips,
  statCompleted,
  statRevenueLabel,
  period,
  onPeriodChange
}: {
  user: User;
  roster: BranchDriver;
  trips: Trip[];
  invoices: Invoice[];
  driverId: string;
  statTrips: number;
  statCompleted: number;
  statRevenueLabel: string;
  period: ProfileOverviewPeriod;
  onPeriodChange: (period: ProfileOverviewPeriod) => void;
}) {
  const profile = branchDriverToProfile(roster);
  const progressValue = driverProfileCompleteness(user, profile);
  const address = formatPostalAddress(user.profile.address);
  const joinDate = formatDate(user.createdAt);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="space-y-4 xl:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Driver details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-y-4">
              {joinDate ? (
                <ContactRow icon={Calendar}>Joined {joinDate}</ContactRow>
              ) : null}
              {address ? <ContactRow icon={MapPin}>{address}</ContactRow> : null}
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
            </div>
          </CardContent>
        </Card>

        <ProfileMiniStats
          items={[
            { label: "Trips", value: statTrips },
            { label: "Completed", value: statCompleted },
            { label: "Revenue", value: statRevenueLabel }
          ]}
        />

        <ProfileCompletenessCard value={progressValue} />
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
            tripsHref={`/dashboard/drivers/${driverId}?tab=trips`}
          />
        </div>
      </div>
    </div>
  );
}
