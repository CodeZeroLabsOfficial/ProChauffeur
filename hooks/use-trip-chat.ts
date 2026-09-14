"use client";

import { useCallback, useEffect, useState } from "react";
import { onValue, push, ref, serverTimestamp, update } from "firebase/database";

import { realtimeDb } from "@/lib/firebase/client";
import {
  canSendTripChat,
  isTripChatSenderRole,
  normalizeTripChatText,
  rtdbTripChatMessagesPath,
  tripChatSenderRoleForUser,
  tripChatThreadFromTrip,
  tripChatThreadUpdatePayload,
  type StaffRole,
  type Trip,
  type TripChatMessage,
  type UserRole
} from "@/lib/models";

function parseMessages(value: unknown): TripChatMessage[] {
  if (!value || typeof value !== "object") return [];
  const rows: TripChatMessage[] = [];
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const v = raw as Record<string, unknown>;
    if (!isTripChatSenderRole(v.senderRole)) continue;
    if (typeof v.senderId !== "string" || typeof v.text !== "string") continue;
    const createdAt = typeof v.createdAt === "number" ? v.createdAt : 0;
    rows.push({
      id,
      senderId: v.senderId,
      senderRole: v.senderRole,
      text: v.text,
      createdAt
    });
  }
  return rows.sort((a, b) => a.createdAt - b.createdAt);
}

async function ensureTripChatThread(trip: Trip, branchId: string): Promise<void> {
  const thread = tripChatThreadFromTrip(trip);
  if (!thread || !branchId || !trip.id) return;
  await update(ref(realtimeDb()), tripChatThreadUpdatePayload(branchId, trip.id, thread));
}

export function useTripChat(
  trip: Trip | null,
  uid: string,
  options?: { role?: UserRole | null; staffRole?: StaffRole | null }
) {
  const [messages, setMessages] = useState<TripChatMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [listenNonce, setListenNonce] = useState(0);

  const branchId = trip?.branchId?.trim() ?? "";
  const tripId = trip?.id ?? "";
  const driverId = trip?.driverID?.trim() ?? "";
  const status = trip?.status ?? "";
  const role = options?.role ?? null;
  const staffRole = options?.staffRole ?? null;

  useEffect(() => {
    if (!branchId || !tripId) {
      setMessages([]);
      setReady(true);
      return;
    }

    let cancelled = false;
    let unsub = () => {};

    void (async () => {
      if (trip) {
        try {
          await ensureTripChatThread(trip, branchId);
        } catch {
          // Listener still attaches; a later send retries ensure via fan-out.
        }
      }
      if (cancelled) return;
      const node = ref(realtimeDb(), rtdbTripChatMessagesPath(branchId, tripId));
      unsub = onValue(
        node,
        (snap) => {
          setMessages(parseMessages(snap.val()));
          setReady(true);
        },
        () => {
          setMessages([]);
          setReady(true);
        }
      );
    })();

    return () => {
      cancelled = true;
      unsub();
    };
  }, [branchId, driverId, listenNonce, status, trip, tripId]);

  const canSend = Boolean(
    trip &&
      canSendTripChat({
        uid,
        role,
        staffRole,
        status: trip.status,
        customerId: trip.customerID,
        driverId: trip.driverID
      })
  );

  const send = useCallback(
    async (raw: string) => {
      setSendError(null);
      if (!trip || !branchId || !tripId) return false;
      const text = normalizeTripChatText(raw);
      const thread = tripChatThreadFromTrip(trip);
      const senderRole = tripChatSenderRoleForUser(uid, trip.customerID, trip.driverID, {
        role,
        staffRole
      });
      if (!text || !thread || !senderRole) return false;
      if (
        !canSendTripChat({
          uid,
          role,
          staffRole,
          status: trip.status,
          customerId: trip.customerID,
          driverId: trip.driverID
        })
      ) {
        return false;
      }

      const messageRef = push(ref(realtimeDb(), rtdbTripChatMessagesPath(branchId, tripId)));
      const key = messageRef.key;
      if (!key) return false;

      try {
        await update(ref(realtimeDb()), {
          ...tripChatThreadUpdatePayload(branchId, tripId, thread),
          [`${rtdbTripChatMessagesPath(branchId, tripId)}/${key}`]: {
            senderId: uid,
            senderRole,
            text,
            createdAt: serverTimestamp()
          }
        });
        setListenNonce((n) => n + 1);
        return true;
      } catch {
        setSendError("Message could not be sent.");
        return false;
      }
    },
    [branchId, role, staffRole, trip, tripId, uid]
  );

  return { messages, ready, canSend, send, sendError };
}
