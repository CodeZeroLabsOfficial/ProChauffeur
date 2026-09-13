"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  HeartIcon,
  MessageSquareIcon,
  SendIcon,
  Star,
  StarIcon,
  TrendingUpIcon
} from "lucide-react";

import { shortBookingId } from "@/lib/bookings/booking-display";
import {
  RATING_TAG_LABELS,
  type RatingTag,
  type TripRating,
  type User
} from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { endOfDay, percentChange, startOfDay } from "@/app/dashboard/lib/dashboard-metrics";
import { DateRangePicker } from "@/components/custom-date-range-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { cn, generateAvatarFallback } from "@/lib/utils";

function ratingInDateRange(ratedAt: Date, range: DateRange | undefined) {
  if (!range?.from) return true;
  const start = startOfDay(range.from);
  const end = endOfDay(range.to ?? range.from);
  return ratedAt >= start && ratedAt <= end;
}

function countInWindow(ratings: TripRating[], from: Date, to: Date) {
  return ratings.filter((r) => r.ratedAt >= from && r.ratedAt <= to).length;
}

function formatCompactCount(n: number) {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(n);
}

function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "size-5" : "size-3.5";
  const filled = Math.min(5, Math.max(0, Math.round(value)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${filled} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={cn(
            cls,
            i < filled ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  );
}

function RatingsSummaryCard({
  total,
  average,
  weekDeltaPct,
  distribution,
  maxCount
}: {
  total: number;
  average: number | null;
  weekDeltaPct: number | null;
  distribution: { stars: number; count: number }[];
  maxCount: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border p-4 sm:grid-cols-3 sm:gap-6 sm:p-6">
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Total Reviews
        </p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums">{total}</span>
          {weekDeltaPct != null ? (
            <Badge
              variant="secondary"
              className="mb-0.5 gap-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUpIcon className="size-3" />
              {weekDeltaPct >= 0 ? "+" : ""}
              {weekDeltaPct.toFixed(0)}%
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">Growth in reviews on this year</p>
      </div>

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Average Rating
        </p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tabular-nums">
            {average == null ? "—" : average.toFixed(1)}
          </span>
        </div>
        <Stars value={average ?? 0} size="md" />
        <p className="text-muted-foreground text-xs">Average rating on this year</p>
      </div>

      <div className="space-y-1.5">
        {distribution.map(({ stars, count }) => (
          <div key={stars} className="flex items-center gap-2">
            <span className="text-muted-foreground w-3 shrink-0 text-right text-xs">{stars}</span>
            <div className="bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-foreground absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`
                }}
              />
            </div>
            <span className="text-muted-foreground w-8 shrink-0 text-right text-xs tabular-nums">
              {formatCompactCount(count)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewRow({
  rating,
  customer,
  showSeparator
}: {
  rating: TripRating;
  customer: User | undefined;
  showSeparator: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const name =
    rating.customerDisplayName?.trim() ||
    customer?.profile.displayName?.trim() ||
    "Customer";
  const photoURL = customer?.profile.photoURL ?? undefined;
  const comment = rating.comment?.trim();
  const bookingLabel = shortBookingId(rating.tripId);

  return (
    <div>
      <div className="flex gap-6 py-5">
        <div className="flex w-44 shrink-0 items-start gap-2.5">
          <Avatar className="size-14 shrink-0 rounded-xl">
            <AvatarImage src={photoURL} alt="" className="rounded-xl object-cover" />
            <AvatarFallback className="rounded-xl">{generateAvatarFallback(name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <p className="text-sm leading-tight font-bold">{name}</p>
            <p className="text-muted-foreground text-xs">
              Booking{" "}
              <Link
                href={`/dashboard/bookings/${rating.tripId}`}
                className="text-foreground font-bold hover:underline">
                {bookingLabel}
              </Link>
            </p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Stars value={rating.score} />
            <span className="text-muted-foreground text-xs">{formatDateTime(rating.ratedAt)}</span>
          </div>
          <p
            className={cn(
              "text-sm leading-relaxed",
              comment ? "text-muted-foreground" : "text-muted-foreground/70 italic"
            )}>
            {comment || "No notes left"}
          </p>
          {rating.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {rating.tags.map((tag) => (
                <Badge key={tag} variant="detail" className="font-normal">
                  {RATING_TAG_LABELS[tag as RatingTag] ?? tag}
                </Badge>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs"
              disabled>
              <MessageSquareIcon className="size-3.5" />
              Public Comment
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-full text-xs"
              disabled>
              <SendIcon className="size-3.5" />
              Direct Message
            </Button>
            <button
              type="button"
              onClick={() => setLiked((v) => !v)}
              className="ml-auto transition-colors"
              aria-label={liked ? "Unlike" : "Like"}>
              <HeartIcon
                className={cn(
                  "size-4 transition-colors",
                  liked
                    ? "fill-blue-500 text-blue-500"
                    : "text-muted-foreground hover:text-blue-400"
                )}
              />
            </button>
          </div>
        </div>
      </div>
      {showSeparator ? <Separator /> : null}
    </div>
  );
}

export function DriverProfileRatingsTab({
  ratings,
  loading,
  rosterAverage,
  rosterCount,
  users
}: {
  ratings: TripRating[];
  loading?: boolean;
  rosterAverage?: number | null;
  rosterCount?: number | null;
  users: User[];
}) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])) as Record<string, User>,
    [users]
  );

  const metrics = useMemo(() => {
    const now = new Date();
    const last7Start = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
    const prior7End = endOfDay(new Date(last7Start.getTime() - 24 * 60 * 60 * 1000));
    const prior7Start = startOfDay(new Date(prior7End.getTime() - 6 * 24 * 60 * 60 * 1000));

    const last7 = countInWindow(ratings, last7Start, endOfDay(now));
    const prior7 = countInWindow(ratings, prior7Start, prior7End);
    const weekDeltaPct =
      prior7 > 0 || last7 > 0 ? percentChange(last7, prior7) : null;

    const listAverage =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
        : null;
    const average =
      typeof rosterAverage === "number" && (rosterCount ?? 0) > 0
        ? rosterAverage
        : listAverage;

    const distribution = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: ratings.filter((r) => r.score === stars).length
    }));
    const maxCount = Math.max(...distribution.map((d) => d.count), 1);

    return {
      total: (rosterCount ?? 0) > 0 ? (rosterCount as number) : ratings.length,
      average,
      weekDeltaPct,
      distribution,
      maxCount
    };
  }, [ratings, rosterAverage, rosterCount]);

  const filteredRatings = useMemo(
    () =>
      [...ratings]
        .filter((r) => ratingInDateRange(r.ratedAt, dateRange))
        .sort((a, b) => b.ratedAt.getTime() - a.ratedAt.getTime()),
    [ratings, dateRange]
  );

  const emptyMessage =
    ratings.length === 0
      ? {
          title: "No ratings yet",
          description: "When customers rate a completed trip, their feedback will appear here."
        }
      : {
          title: "No feedback in this range",
          description: "Try a different date range to see more reviews."
        };

  return (
    <div className="space-y-4">
      <RatingsSummaryCard
        total={metrics.total}
        average={metrics.average}
        weekDeltaPct={metrics.weekDeltaPct}
        distribution={metrics.distribution}
        maxCount={metrics.maxCount}
      />

      <Card className="min-w-0 py-0">
        <CardContent className="space-y-2 px-6 pb-4 pt-4">
          <div className="flex items-center justify-between gap-3 py-2">
            <h3 className="text-base font-semibold">Recent feedback</h3>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              defaultPreset="allTime"
              className="shrink-0"
            />
          </div>

          {loading ? (
            <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
              Loading ratings…
            </div>
          ) : filteredRatings.length ? (
            <div>
              {filteredRatings.map((rating, index) => (
                <ReviewRow
                  key={rating.id}
                  rating={rating}
                  customer={usersById[rating.customerID]}
                  showSeparator={index < filteredRatings.length - 1}
                />
              ))}
            </div>
          ) : (
            <Empty className="border-0 py-12 md:py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Star />
                </EmptyMedia>
                <EmptyTitle className="text-xl">{emptyMessage.title}</EmptyTitle>
                <EmptyDescription>{emptyMessage.description}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
