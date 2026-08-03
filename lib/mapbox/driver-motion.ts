import { bearingDegrees } from "@/lib/geo/bearing";
import { destinationPoint } from "@/lib/geo/destination";
import { haversineMeters } from "@/lib/geo/haversine";

const MIN_ANIMATION_MS = 1000;
const MAX_ANIMATION_MS = 5000;
const DEFAULT_INTERVAL_MS = 3000;
const MIN_MOVE_METERS = 2;
const MAX_SPEED_MPS = 40;
const MIN_COAST_SPEED_MPS = 0.4;
const HARD_CORRECT_METERS = 80;
const COAST_BUDGET_FACTOR = 1.75;
const COAST_DECAY_MS = 2000;

export type DriverFix = {
  lat: number;
  lng: number;
  heading: number | null;
  updatedAt: number;
  driverId: string;
};

export type DriverPose = {
  lat: number;
  lng: number;
  heading: number | null;
};

type Velocity = {
  speedMps: number;
  bearingDeg: number;
};

type LerpAnim = {
  fromLat: number;
  fromLng: number;
  fromHeading: number | null;
  toLat: number;
  toLng: number;
  toHeading: number | null;
  startMs: number;
  durationMs: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  const delta = ((b - a + 540) % 360) - 180;
  return a + delta * t;
}

/**
 * Client-side driver pin motion: lerp across the inter-fix interval, then
 * coast with estimated velocity until the next GPS sample.
 */
export function createDriverMotion() {
  let pose: DriverPose | null = null;
  let prevFix: DriverFix | null = null;
  let driverId: string | null = null;
  let lastReceivedAt = 0;
  let lastIntervalMs = DEFAULT_INTERVAL_MS;
  let lastTickMs = 0;
  let velocity: Velocity | null = null;
  let lerpAnim: LerpAnim | null = null;

  function reset(fix: DriverFix, nowMs: number): DriverPose {
    pose = { lat: fix.lat, lng: fix.lng, heading: fix.heading };
    prevFix = fix;
    driverId = fix.driverId;
    lastReceivedAt = nowMs;
    lastTickMs = nowMs;
    velocity = null;
    lerpAnim = null;
    return pose;
  }

  function pushFix(fix: DriverFix, nowMs: number): DriverPose {
    if (!pose || driverId !== fix.driverId) {
      return reset(fix, nowMs);
    }

    let intervalMs = DEFAULT_INTERVAL_MS;
    if (prevFix && fix.updatedAt > prevFix.updatedAt) {
      intervalMs = fix.updatedAt - prevFix.updatedAt;
    } else if (lastReceivedAt > 0) {
      intervalMs = nowMs - lastReceivedAt;
    }
    intervalMs = clamp(intervalMs, MIN_ANIMATION_MS, MAX_ANIMATION_MS);
    lastIntervalMs = intervalMs;

    if (prevFix) {
      const segmentM = haversineMeters(prevFix.lat, prevFix.lng, fix.lat, fix.lng);
      if (segmentM >= MIN_MOVE_METERS) {
        const dtSec = Math.max(
          0.001,
          prevFix.updatedAt > 0 && fix.updatedAt > prevFix.updatedAt
            ? (fix.updatedAt - prevFix.updatedAt) / 1000
            : intervalMs / 1000
        );
        velocity = {
          speedMps: clamp(segmentM / dtSec, 0, MAX_SPEED_MPS),
          bearingDeg:
            fix.heading ??
            bearingDegrees(prevFix.lat, prevFix.lng, fix.lat, fix.lng)
        };
      } else {
        velocity = null;
      }
    }

    const errorM = haversineMeters(pose.lat, pose.lng, fix.lat, fix.lng);
    prevFix = fix;
    lastReceivedAt = nowMs;

    if (errorM < MIN_MOVE_METERS) {
      pose = {
        lat: fix.lat,
        lng: fix.lng,
        heading: fix.heading ?? pose.heading
      };
      lerpAnim = null;
      return pose;
    }

    const durationMs =
      errorM > HARD_CORRECT_METERS
        ? Math.min(intervalMs, MIN_ANIMATION_MS)
        : intervalMs;

    lerpAnim = {
      fromLat: pose.lat,
      fromLng: pose.lng,
      fromHeading: pose.heading,
      toLat: fix.lat,
      toLng: fix.lng,
      toHeading:
        fix.heading ??
        velocity?.bearingDeg ??
        bearingDegrees(pose.lat, pose.lng, fix.lat, fix.lng),
      startMs: nowMs,
      durationMs
    };

    return pose;
  }

  /** Advance motion. Returns the pose when it changed this frame, else null. */
  function tick(nowMs: number): DriverPose | null {
    if (!pose) return null;

    const prevTick = lastTickMs || nowMs;
    const dtSec = clamp((nowMs - prevTick) / 1000, 0, 0.1);
    lastTickMs = nowMs;

    if (lerpAnim) {
      const t = clamp((nowMs - lerpAnim.startMs) / lerpAnim.durationMs, 0, 1);
      pose = {
        lat: lerp(lerpAnim.fromLat, lerpAnim.toLat, t),
        lng: lerp(lerpAnim.fromLng, lerpAnim.toLng, t),
        heading:
          lerpAnim.fromHeading != null && lerpAnim.toHeading != null
            ? lerpAngle(lerpAnim.fromHeading, lerpAnim.toHeading, t)
            : (lerpAnim.toHeading ?? lerpAnim.fromHeading)
      };
      if (t >= 1) lerpAnim = null;
      return pose;
    }

    if (!velocity || velocity.speedMps < MIN_COAST_SPEED_MPS) {
      return null;
    }

    const sinceFixMs = nowMs - lastReceivedAt;
    const coastBudgetMs = lastIntervalMs * COAST_BUDGET_FACTOR;
    let speed = velocity.speedMps;
    if (sinceFixMs > coastBudgetMs) {
      speed *= 1 - clamp((sinceFixMs - coastBudgetMs) / COAST_DECAY_MS, 0, 1);
    }

    if (speed < MIN_COAST_SPEED_MPS) {
      velocity = null;
      return null;
    }

    const next = destinationPoint(pose.lat, pose.lng, velocity.bearingDeg, speed * dtSec);
    pose = {
      lat: next.lat,
      lng: next.lng,
      heading: velocity.bearingDeg
    };
    return pose;
  }

  function getPose(): DriverPose | null {
    return pose;
  }

  return { pushFix, tick, getPose };
}

export type DriverMotion = ReturnType<typeof createDriverMotion>;
