import Link from "next/link";
import { ClipboardMinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingList } from "@/app/dashboard/components/booking-list";
import { BookingsCard } from "@/app/dashboard/components/bookings-card";
import { BookingsStatusCard } from "@/app/dashboard/components/bookings-status-card";
import { BookingsTrendChart } from "@/app/dashboard/components/bookings-trend-chart";
import { RecentActivities } from "@/app/dashboard/components/recent-activities";
import { RevenueStat } from "@/app/dashboard/components/revenue-stat";
import { SummaryCards } from "@/app/dashboard/components/summary-cards";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Overview of chauffeur operations across dispatch, bookings and fleet.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/bookings">
              <PlusIcon /> <span className="hidden md:flex">Add new</span>
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/reports">
              <ClipboardMinusIcon /> <span className="hidden md:flex">Reports</span>
            </Link>
          </Button>
        </div>
      </div>

      <SummaryCards />

      <div className="gap-4 space-y-4 xl:grid xl:grid-cols-3 xl:space-y-0">
        <BookingsStatusCard />
        <div className="xl:col-span-2">
          <BookingsTrendChart />
        </div>
      </div>

      <div className="gap-4 space-y-4 xl:grid xl:grid-cols-3 xl:space-y-0">
        <RecentActivities />
        <RevenueStat />
        <BookingsCard />
      </div>

      <BookingList />
    </div>
  );
}
