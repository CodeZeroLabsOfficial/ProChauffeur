"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, SendIcon } from "lucide-react";

import { useTripChat } from "@/hooks/use-trip-chat";
import { formatTime, formatDateTime } from "@/lib/format";
import {
  canSendTripChat,
  tripChatSenderLabel,
  tripChatSenderRoleForUser,
  tripStatusTitle,
  type StaffRole,
  type Trip,
  type TripChatMessage,
  type UserRole
} from "@/lib/models";
import { generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function TripChatBubble({
  message,
  own
}: {
  message: TripChatMessage;
  own: boolean;
}) {
  const time = message.createdAt > 0 ? formatTime(new Date(message.createdAt)) : "";
  return (
    <div className={`flex w-full flex-col gap-1 ${own ? "items-end" : ""}`}>
      <Bubble variant={own ? "default" : "muted"} align={own ? "end" : "start"}>
        {!own ? (
          <span className="text-muted-foreground px-1 text-xs font-medium">
            {tripChatSenderLabel(message.senderRole)}
          </span>
        ) : null}
        <BubbleContent className="whitespace-pre-wrap">{message.text}</BubbleContent>
      </Bubble>
      {time ? (
        <span className="text-muted-foreground text-xs">{time}</span>
      ) : null}
    </div>
  );
}

export function TripChatScreen({
  trip,
  uid,
  role,
  staffRole,
  counterpartName,
  counterpartPhotoURL,
  backHref
}: {
  trip: Trip;
  uid: string;
  role?: UserRole | null;
  staffRole?: StaffRole | null;
  counterpartName: string;
  counterpartPhotoURL?: string | null;
  backHref: string;
}) {
  const { messages, canSend, send, sendError } = useTripChat(trip, uid, { role, staffRole });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const stillOpen = canSendTripChat({
    uid,
    role,
    staffRole,
    status: trip.status,
    customerId: trip.customerID,
    driverId: trip.driverID
  });
  const isParticipant =
    tripChatSenderRoleForUser(uid, trip.customerID, trip.driverID, { role, staffRole }) != null;

  const subtitle = `${tripStatusTitle[trip.status]} · ${formatDateTime(
    trip.journey.scheduledPickupAt ?? trip.createdAt
  )}`;

  const groups = useMemo(() => {
    const out: { day: string; items: TripChatMessage[] }[] = [];
    for (const message of messages) {
      const key = message.createdAt > 0 ? dayKey(message.createdAt) : "pending";
      const last = out[out.length - 1];
      if (!last || last.day !== key) out.push({ day: key, items: [message] });
      else last.items.push(message);
    }
    return out;
  }, [messages]);

  const bubbleGroups = useMemo(() => {
    return groups.map((group) => {
      const chunks: TripChatMessage[][] = [];
      for (const message of group.items) {
        const last = chunks[chunks.length - 1];
        if (last && last[0]?.senderId === message.senderId) last.push(message);
        else chunks.push([message]);
      }
      return { day: group.day, chunks, firstAt: group.items[0]?.createdAt ?? 0 };
    });
  }, [groups]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  async function onSend() {
    if (sending) return;
    setSending(true);
    const ok = await send(draft);
    if (ok) setDraft("");
    setSending(false);
  }

  return (
    <div className="bg-background flex h-[calc(100dvh-6rem)] w-full flex-col overflow-hidden rounded-xl border">
      <header className="flex items-center gap-3 border-b px-3 py-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={backHref} aria-label="Back to booking">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <Avatar className="size-10">
          <AvatarImage src={counterpartPhotoURL ?? undefined} alt={counterpartName} />
          <AvatarFallback>{generateAvatarFallback(counterpartName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{counterpartName}</p>
          <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
        </div>
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 lg:px-4">
        <div className="flex flex-col gap-6 py-6">
          <p className="text-muted-foreground text-center text-xs">
            Messages stay on this trip only.
          </p>
          {!isParticipant ? (
            <p className="text-muted-foreground text-center text-sm">
              Trip messages are only visible to the passenger, chauffeur, and Dispatch.
            </p>
          ) : null}
          {isParticipant && messages.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No messages yet.</p>
          ) : null}
          {bubbleGroups.map((group) => (
            <div key={group.day} className="flex flex-col gap-6">
              {group.firstAt ? (
                <p className="bg-muted text-muted-foreground mx-auto w-fit rounded-full px-3 py-0.5 text-[11px]">
                  {new Date(group.firstAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric"
                  })}
                </p>
              ) : null}
              {group.chunks.map((chunk) => (
                <BubbleGroup key={chunk[0]?.id}>
                  {chunk.map((message) => (
                    <TripChatBubble
                      key={message.id}
                      message={message}
                      own={message.senderId === uid}
                    />
                  ))}
                </BubbleGroup>
              ))}
            </div>
          ))}
        </div>
      </div>

      {stillOpen && canSend ? (
        <form
          className="lg:px-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSend();
          }}>
          <div className="border-border bg-background focus-within:border-ring focus-within:ring-ring/50 m-3 flex items-end gap-1 rounded-lg border p-2 transition-colors focus-within:ring-3">
            <Textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
              placeholder="Type a message…"
              className="max-h-40 min-h-9 flex-1 resize-none border-0 bg-transparent px-2 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
              maxLength={500}
            />
            <Button
              type="submit"
              className="ms-3"
              disabled={sending || !draft.trim()}
              aria-label="Send">
              <span className="hidden lg:inline">Send</span>
              <SendIcon className="inline lg:hidden" />
            </Button>
          </div>
          {sendError ? (
            <p className="text-destructive mb-3 px-4 text-xs">{sendError}</p>
          ) : null}
        </form>
      ) : (
        <div className="border-t px-4 py-3">
          <p className="text-muted-foreground text-center text-sm">
            {isParticipant
              ? "This trip has ended. Messaging is closed."
              : "Messaging is only available to the passenger, chauffeur, and Dispatch."}
          </p>
        </div>
      )}
    </div>
  );
}
