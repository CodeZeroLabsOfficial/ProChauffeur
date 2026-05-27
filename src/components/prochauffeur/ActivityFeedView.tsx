"use client";

import { useAdminDashboard } from "@/context/AdminDashboardContext";
import {
  ACTIVITY_TIME_RANGES,
  filterActivityItems,
  type ActivityTimeRange,
} from "@/lib/prochauffeur/activityHelpers";
import Link from "next/link";
import React, { useMemo, useState } from "react";

export default function ActivityFeedView() {
  const vm = useAdminDashboard();
  const [range, setRange] = useState<ActivityTimeRange>("today");

  const filteredItems = useMemo(
    () => filterActivityItems(vm.recentActivityItems, range),
    [range, vm.recentActivityItems]
  );

  return (
    <div>
      <div className="mb-6 flex rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03]">
        {ACTIVITY_TIME_RANGES.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              range === tab.id
                ? "bg-brand-500 text-white"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
            }`}
            onClick={() => setRange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!vm.hasReceivedTripsSnapshot ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading activity…
        </p>
      ) : vm.recentActivityItems.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white/90">
            No activity yet
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Trip updates will appear here as bookings move through the lifecycle.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="font-semibold text-gray-800 dark:text-white/90">
            No activity in this period
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Try a wider time range to see earlier trip events.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {filteredItems.map((item, index) => (
            <Link
              key={`${item.id}-${item.occurredAt.getTime()}`}
              href={`/bookings/${item.id}`}
              className={`block px-5 py-4 transition hover:bg-gray-50 dark:hover:bg-white/[0.02] ${
                index < filteredItems.length - 1
                  ? "border-b border-gray-100 dark:border-gray-800"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white/90">
                    {item.headline}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {item.subline}
                  </p>
                </div>
                <span className="text-sm text-brand-500">View trip</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
