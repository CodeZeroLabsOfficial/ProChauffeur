import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";

import type { TripStatus } from "@/lib/models";

/** Firestore fields for a trip status transition, including journey milestones. */
export function tripStatusUpdateFields(
  status: TripStatus,
  existing: DocumentData | undefined
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp()
  };

  const journey =
    existing?.journey && typeof existing.journey === "object"
      ? (existing.journey as DocumentData)
      : {};

  if (status === "in_progress" && journey.journeyStartedAt == null) {
    fields["journey.journeyStartedAt"] = FieldValue.serverTimestamp();
  }

  if (status === "completed" && journey.journeyCompletedAt == null) {
    fields["journey.journeyCompletedAt"] = FieldValue.serverTimestamp();

    if (journey.journeyDurationSeconds == null && journey.journeyStartedAt != null) {
      const startedAt =
        journey.journeyStartedAt instanceof Timestamp
          ? journey.journeyStartedAt.toDate()
          : journey.journeyStartedAt instanceof Date
            ? journey.journeyStartedAt
            : null;
      if (startedAt) {
        fields["journey.journeyDurationSeconds"] = Math.max(
          0,
          Math.round((Date.now() - startedAt.getTime()) / 1000)
        );
      }
    }
  }

  return fields;
}
