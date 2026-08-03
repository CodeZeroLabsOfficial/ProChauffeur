import { tripStatusTitle, type Trip } from "@/lib/models";

export type TripProgressKind = "idle" | "en_route" | "in_progress" | "completed";
export type TripProgressOnTime = "early" | "on_time" | "late";

export type TripProgress = {
  kind: TripProgressKind;
  percent: number | null;
  etaLabel: string | null;
  onTime: TripProgressOnTime | null;
  phaseLabel: string | null;
};

export const IDLE_TRIP_PROGRESS: TripProgress = {
  kind: "idle",
  percent: null,
  etaLabel: null,
  onTime: null,
  phaseLabel: null
};

const ON_TIME_SLACK_SECONDS = 2 * 60;

export function formatEtaDuration(durationSeconds: number): string {
  const minutes = Math.max(0, Math.round(durationSeconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem ? `${hours} hr ${rem} min` : `${hours} hr`;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function finiteSeconds(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : null;
}

function computeOnTime(etaAt: Date, deadline: Date | null | undefined): TripProgressOnTime | null {
  if (!deadline) return null;
  const deltaSeconds = (etaAt.getTime() - deadline.getTime()) / 1000;
  if (deltaSeconds < -ON_TIME_SLACK_SECONDS) return "early";
  if (deltaSeconds > ON_TIME_SLACK_SECONDS) return "late";
  return "on_time";
}

/** Pure trip progress from status, timestamps, and optional live ETA metrics. */
export function computeTripProgress({
  trip,
  remainingDurationSeconds = null,
  baselineDurationSeconds = null,
  now = new Date()
}: {
  trip: Trip;
  remainingDurationSeconds?: number | null;
  baselineDurationSeconds?: number | null;
  now?: Date;
}): TripProgress {
  if (trip.status === "completed") {
    return {
      kind: "completed",
      percent: 100,
      etaLabel: null,
      onTime: null,
      phaseLabel: tripStatusTitle.completed
    };
  }

  if (trip.status !== "en_route_pickup" && trip.status !== "in_progress") {
    return IDLE_TRIP_PROGRESS;
  }

  const remaining = finiteSeconds(remainingDurationSeconds);
  const baselineRaw = finiteSeconds(baselineDurationSeconds);
  const baseline = baselineRaw != null && baselineRaw > 0 ? baselineRaw : null;
  const etaAt = remaining != null ? new Date(now.getTime() + remaining * 1000) : null;
  const etaLabel = remaining != null ? formatEtaDuration(remaining) : null;

  if (trip.status === "en_route_pickup") {
    return {
      kind: "en_route",
      percent:
        remaining != null && baseline != null
          ? clampPercent((1 - remaining / baseline) * 100)
          : null,
      etaLabel,
      onTime: etaAt ? computeOnTime(etaAt, trip.scheduledPickupAt) : null,
      phaseLabel: tripStatusTitle.en_route_pickup
    };
  }

  let percent: number | null = null;
  if (remaining != null && baseline != null) {
    percent = clampPercent((1 - remaining / baseline) * 100);
  } else if (remaining != null && trip.journeyStartedAt) {
    const elapsedSeconds = Math.max(0, (now.getTime() - trip.journeyStartedAt.getTime()) / 1000);
    const total = elapsedSeconds + remaining;
    percent = total > 0 ? clampPercent((elapsedSeconds / total) * 100) : null;
  }

  let onTime: TripProgressOnTime | null = null;
  if (etaAt && baseline != null && trip.journeyStartedAt) {
    onTime = computeOnTime(
      etaAt,
      new Date(trip.journeyStartedAt.getTime() + baseline * 1000)
    );
  }

  return {
    kind: "in_progress",
    percent,
    etaLabel,
    onTime,
    phaseLabel: tripStatusTitle.in_progress
  };
}
