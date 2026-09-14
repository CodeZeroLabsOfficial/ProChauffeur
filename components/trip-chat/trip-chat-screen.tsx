"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, SendIcon } from "lucide-react";

import { useTripChat } from "@/hooks/use-trip-chat";
import { formatTime, formatDateTime } from "@/lib/format";
import {
  canSendTripChat,
  tripChatSenderRoleForUser,
  tripStatusTitle,
  type Trip,
  type TripChatMessage
} from "@/lib/models";
import { cn, generateAvatarFallback } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function TripChatBubble({
  message,
  own,
  showTail
}: {
  message: TripChatMessage;
  own: boolean;
  showTail: boolean;
}) {
  const time = message.createdAt > 0 ? formatTime(new Date(message.createdAt)) : "";
  return (
    <div className={cn("flex w-full", own ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[78%] px-3 py-2 text-sm",
          own
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
          showTail
            ? own
              ? "rounded-[18px] rounded-br-sm"
              : "rounded-[18px] rounded-bl-sm"
            : "rounded-[18px]"
        )}>
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        {time ? (
          <p
            className={cn(
              "mt-1 text-right text-[10px] leading-none",
              own ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
            {time}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TripChatScreen({
  trip,
  uid,
  counterpartName,
  counterpartPhotoURL,
  backHref
}: {
  trip: Trip;
  uid: string;
  counterpartName: string;
  counterpartPhotoURL?: string | null;
  backHref: string;
}) {
  const { messages, canSend, send, sendError } = useTripChat(trip, uid);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const stillOpen = canSendTripChat({
    uid,
    status: trip.status,
    customerId: trip.customerID,
    driverId: trip.driverID
  });
  const isParticipant = tripChatSenderRoleForUser(uid, trip.customerID, trip.driverID) != null;

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
    <div className="bg-background mx-auto flex h-[calc(100dvh-6rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border">
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

      <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <p className="text-muted-foreground text-center text-xs">
          Messages stay on this trip only.
        </p>
        {!isParticipant ? (
          <p className="text-muted-foreground text-center text-sm">
            Trip messages are only visible to the passenger and chauffeur.
          </p>
        ) : null}
        {groups.map((group) => (
          <div key={group.day} className="space-y-2">
            {group.items[0]?.createdAt ? (
              <p className="bg-muted text-muted-foreground mx-auto w-fit rounded-full px-3 py-0.5 text-[11px]">
                {new Date(group.items[0].createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric"
                })}
              </p>
            ) : null}
            {group.items.map((message, index) => {
              const own = message.senderId === uid;
              const next = group.items[index + 1];
              const showTail = !next || next.senderId !== message.senderId;
              return (
                <TripChatBubble
                  key={message.id}
                  message={message}
                  own={own}
                  showTail={showTail}
                />
              );
            })}
          </div>
        ))}
      </div>

      {stillOpen && canSend ? (
        <form
          className="border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onSend();
          }}>
          <div className="flex items-end gap-2">
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
              className="max-h-32 min-h-10 flex-1 resize-none"
              maxLength={500}
            />
            <Button
              type="submit"
              size="icon"
              className="size-10 shrink-0"
              disabled={sending || !draft.trim()}
              aria-label="Send">
              <SendIcon />
            </Button>
          </div>
          {sendError ? <p className="text-destructive mt-2 text-xs">{sendError}</p> : null}
        </form>
      ) : (
        <div className="border-t px-4 py-3">
          <p className="text-muted-foreground text-center text-sm">
            {isParticipant
              ? "This trip has ended. Messaging is closed."
              : "Messaging is only available to the passenger and chauffeur."}
          </p>
        </div>
      )}
    </div>
  );
}
