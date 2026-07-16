import type { FleetWeeklyOperatingSchedule } from "@/lib/models/user";

/** Branch operating hours — `branches/{branchId}/settings/operating_hours` document. */
export interface AppFleetOperatingHours {
  timeZoneIdentifier?: string | null;
  schedules: FleetWeeklyOperatingSchedule[];
}

export const emptyOperatingHours: AppFleetOperatingHours = {
  timeZoneIdentifier: null,
  schedules: []
};
