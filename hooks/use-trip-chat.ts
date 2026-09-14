"use client";

import { useCallback, useEffect, useState } from "react";
import { onValue, push, ref, serverTimestamp, update } from "firebase/database";

import { realtimeDb } from "@/lib/firebase/client";
import {
  canSendTripChat,
  isTripChatSenderRole,
  normalizeTripChatText,
  rtdbTripChatMessagesPath,
  rtdbTripChatPath,
  tripChatSenderRoleForUser,
  tripChatThreadFromTrip,
  type Trip,
  type TripChatMessage
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

export function useTripChat(trip: Trip | null, uid: string) {
  const [messages, setMessages] = useState<TripChatMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const branchId = trip?.branchId?.trim() ?? "";
  const tripId = trip?.id ?? "";

  useEffect(() => {
    if (!branchId || !tripId) {
      setMessages([]);
      setReady(true);
      return;
    }

    const node = ref(realtimeDb(), rtdbTripChatMessagesPath(branchId, tripId));
    const unsub = onValue(
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
    return () => unsub();
  }, [branchId, tripId]);

  const canSend = Boolean(
    trip &&
      canSendTripChat({
        uid,
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
      const senderRole = tripChatSenderRoleForUser(uid, trip.customerID, trip.driverID);
      if (!text || !thread || !senderRole) return false;
      if (
        !canSendTripChat({
          uid,
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

      const root = rtdbTripChatPath(branchId, tripId);
      try {
        await update(ref(realtimeDb()), {
          [`${root}/customerId`]: thread.customerId,
          [`${root}/driverId`]: thread.driverId,
          [`${root}/status`]: thread.status,
          [`${root}/messages/${key}`]: {
            senderId: uid,
            senderRole,
            text,
            createdAt: serverTimestamp()
          }
        });
        return true;
      } catch {
        setSendError("Message could not be sent.");
        return false;
      }
    },
    [branchId, trip, tripId, uid]
  );

  return { messages, ready, canSend, send, sendError };
}
