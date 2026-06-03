import type { FleetWeeklyOperatingSchedule } from "@/lib/models/user";

/** AppFleetOperatingHours.swift — `operator/operating_hours` document. */
export interface AppFleetOperatingHours {
  timeZoneIdentifier?: string | null;
  schedules: FleetWeeklyOperatingSchedule[];
}

export const emptyOperatingHours: AppFleetOperatingHours = {
  timeZoneIdentifier: null,
  schedules: []
};
