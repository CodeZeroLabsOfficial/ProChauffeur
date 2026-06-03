import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { adminFirestore } from "@/lib/firebase/admin";
import type { SessionUser } from "@/lib/firebase/session";
import type { CreateActivityNotificationInput } from "@/lib/models/notification";

/** Best-effort activity notification write from server routes (Admin SDK). */
export async function createActivityNotificationAdmin(
  input: CreateActivityNotificationInput,
  actor: SessionUser
): Promise<void> {
  try {
    await adminFirestore()
      .collection("notifications")
      .add({
        category: input.category,
        action: input.action,
        title: input.title,
        message: input.message,
        ...(input.href ? { href: input.href } : {}),
        ...(input.entityId ? { entityId: input.entityId } : {}),
        actorId: input.actorId ?? actor.uid,
        actorName: input.actorName ?? actor.displayName ?? actor.email ?? "Admin",
        readAt: null,
        createdAt: FieldValue.serverTimestamp()
      });
  } catch (err) {
    console.error("Failed to write activity notification:", err);
  }
}
