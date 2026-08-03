import { tripStatusTitle, type Trip } from "@/lib/models";

export type TripProgressKind = "idle" | "en_route" | "in_progress" | "completed";
export type TripProgressOnTime = "early" | "on_time" | "late";
export type TripProgressTarget = "pickup" | "dropoff";

export type TripProgress = {
  kind: TripProgressKind;
  percent: number | null;
  label: string | null;
  etaLabel: string | null;
  etaAt: Date | null;
  onTime: TripProgressOnTime | null;
  phaseLabel: string | null;
  target: TripProgressTarget | null;
};

export const IDLE_TRIP_PROGRESS: TripProgress = {
  kind: "idle",
  percent: null,
  label: null,
  etaLabel: null,
  etaAt: null,
  onTime: null,
  phaseLabel: null,
  target: null
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

function computeOnTime(
  etaAt: Date,
  deadline: Date | null | undefined
): TripProgressOnTime | null {
  if (!deadline) return null;
  const deltaSeconds = (etaAt.getTime() - deadline.getTime()) / 1000;
  if (deltaSeconds < -ON_TIME_SLACK_SECONDS) return "early";
  if (deltaSeconds > ON_TIME_SLACK_SECONDS) return "late";
  return "on_time";
}

export type ComputeTripProgressInput = {
  trip: Trip;
  remainingDurationSeconds?: number | null;
  baselineDurationSeconds?: number | null;
  now?: Date;
};

/** Pure trip progress from status, timestamps, and optional live ETA metrics. */
export function computeTripProgress({
  trip,
  remainingDurationSeconds = null,
  baselineDurationSeconds = null,
  now = new Date()
}: ComputeTripProgressInput): TripProgress {
  if (trip.status === "completed") {
    return {
      kind: "completed",
      percent: 100,
      label: "Completed",
      etaLabel: null,
      etaAt: trip.journeyCompletedAt ?? null,
      onTime: null,
      phaseLabel: tripStatusTitle.completed,
      target: null
    };
  }

  if (trip.status === "en_route_pickup") {
    const remaining =
      typeof remainingDurationSeconds === "number" && Number.isFinite(remainingDurationSeconds)
        ? Math.max(0, remainingDurationSeconds)
        : null;
    const baseline =
      typeof baselineDurationSeconds === "number" &&
      Number.isFinite(baselineDurationSeconds) &&
      baselineDurationSeconds > 0
        ? baselineDurationSeconds
        : null;

    const etaAt = remaining != null ? new Date(now.getTime() + remaining * 1000) : null;
    const percent =
      remaining != null && baseline != null
        ? clampPercent((1 - remaining / baseline) * 100)
        : null;
    const etaLabel = remaining != null ? formatEtaDuration(remaining) : null;
    const onTime = etaAt ? computeOnTime(etaAt, trip.scheduledPickupAt) : null;

    return {
      kind: "en_route",
      percent,
      label: etaLabel ? `${etaLabel} to pickup` : "Enroute",
      etaLabel,
      etaAt,
      onTime,
      phaseLabel: tripStatusTitle.en_route_pickup,
      target: "pickup"
    };
  }

  if (trip.status === "in_progress") {
    const remaining =
      typeof remainingDurationSeconds === "number" && Number.isFinite(remainingDurationSeconds)
        ? Math.max(0, remainingDurationSeconds)
        : null;
    const baseline =
      typeof baselineDurationSeconds === "number" &&
      Number.isFinite(baselineDurationSeconds) &&
      baselineDurationSeconds > 0
        ? baselineDurationSeconds
        : null;

    const etaAt = remaining != null ? new Date(now.getTime() + remaining * 1000) : null;
    const etaLabel = remaining != null ? formatEtaDuration(remaining) : null;

    let percent: number | null = null;
    if (remaining != null && baseline != null) {
      percent = clampPercent((1 - remaining / baseline) * 100);
    } else if (remaining != null && trip.journeyStartedAt) {
      const elapsedSeconds = Math.max(
        0,
        (now.getTime() - trip.journeyStartedAt.getTime()) / 1000
      );
      const total = elapsedSeconds + remaining;
      percent = total > 0 ? clampPercent((elapsedSeconds / total) * 100) : null;
    }

    let onTime: TripProgressOnTime | null = null;
    if (etaAt && baseline != null && trip.journeyStartedAt) {
      const expectedFinish = new Date(trip.journeyStartedAt.getTime() + baseline * 1000);
      onTime = computeOnTime(etaAt, expectedFinish);
    }

    return {
      kind: "in_progress",
      percent,
      label: etaLabel ? `${etaLabel} to dropoff` : "In progress",
      etaLabel,
      etaAt,
      onTime,
      phaseLabel: tripStatusTitle.in_progress,
      target: "dropoff"
    };
  }

  return IDLE_TRIP_PROGRESS;
}
