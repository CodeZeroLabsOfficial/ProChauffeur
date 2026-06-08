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

  if (status === "in_progress" && existing?.journeyStartedAt == null) {
    fields.journeyStartedAt = FieldValue.serverTimestamp();
  }

  if (status === "completed" && existing?.journeyCompletedAt == null) {
    fields.journeyCompletedAt = FieldValue.serverTimestamp();

    if (existing?.journeyDurationSeconds == null && existing?.journeyStartedAt != null) {
      const startedAt =
        existing.journeyStartedAt instanceof Timestamp
          ? existing.journeyStartedAt.toDate()
          : existing.journeyStartedAt instanceof Date
            ? existing.journeyStartedAt
            : null;
      if (startedAt) {
        fields.journeyDurationSeconds = Math.max(
          0,
          Math.round((Date.now() - startedAt.getTime()) / 1000)
        );
      }
    }
  }

  return fields;
}
