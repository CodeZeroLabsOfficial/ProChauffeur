/**
 * Customer trip rating — `branches/{branchId}/ratings/{id}`.
 * Written only by the submitTripRating callable.
 */

export const RATING_TAGS = [
  "punctuality",
  "cleanliness",
  "professionalism",
  "communication",
  "vehicle_condition"
] as const;

export type RatingTag = (typeof RATING_TAGS)[number];

export const RATING_TAG_LABELS: Record<RatingTag, string> = {
  punctuality: "Punctuality",
  cleanliness: "Cleanliness",
  professionalism: "Professionalism",
  communication: "Communication",
  vehicle_condition: "Vehicle condition"
};

export const RATING_SCORE_MIN = 1;
export const RATING_SCORE_MAX = 5;

/** Rating document at `branches/{branchId}/ratings/{id}`. */
export interface TripRating {
  id: string;
  branchId: string;
  tripId: string;
  driverID: string;
  customerID: string;
  /** Integer 1–5. */
  score: number;
  tags: RatingTag[];
  comment?: string | null;
  ratedAt: Date;
  /** Snapshot for list UI without joining users. */
  customerDisplayName?: string | null;
  /** Snapshot from trip journey completion. */
  tripCompletedAt?: Date | null;
}

export function isRatingTag(value: string): value is RatingTag {
  return (RATING_TAGS as readonly string[]).includes(value);
}
