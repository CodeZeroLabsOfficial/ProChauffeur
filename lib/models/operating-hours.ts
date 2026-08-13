import type { FleetWeeklyOperatingSchedule } from "@/lib/models/user";

/** Branch operating hours — `branches/{branchId}/settings/operating_hours` document.
 * Wall-clock times are in that Location's `settings/locale.timezone`.
 */
export interface AppFleetOperatingHours {
  schedules: FleetWeeklyOperatingSchedule[];
}

export const emptyOperatingHours: AppFleetOperatingHours = {
  schedules: []
};
