"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Frown, Meh, Smile, StarIcon, Star } from "lucide-react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@/components/ui/empty";
import { cn, generateAvatarFallback } from "@/lib/utils";

const feedbackPillStyle =
  "border-green-300 bg-green-50 font-normal text-green-700 dark:bg-green-950/40 dark:text-green-300";

const ratingRingConfig = {
  value: { label: "Rating", color: "var(--chart-2)" }
} satisfies ChartConfig;

function ratingInDateRange(ratedAt: Date, range: DateRange | undefined) {
  if (!range?.from) return true;
  const start = startOfDay(range.from);
  const end = endOfDay(range.to ?? range.from);
  return ratedAt >= start && ratedAt <= end;
}

function countInWindow(ratings: TripRating[], from: Date, to: Date) {
  return ratings.filter((r) => r.ratedAt >= from && r.ratedAt <= to).length;
}

function StarRow({ score }: { score: number }) {
  const clamped = Math.min(5, Math.max(0, Math.round(score)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${clamped} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={cn(
            "size-3.5",
            i < clamped
              ? "fill-orange-400 text-orange-400"
              : "fill-transparent text-muted-foreground/35"
          )}
        />
      ))}
    </div>
  );
}

function ReviewRatingMetricCard({ average }: { average: number | null }) {
  const pct = average == null ? 0 : Math.min(100, Math.max(0, (average / 5) * 100));
  const chartData = [{ metric: "rating", value: pct, fill: "var(--color-value)" }];

  return (
    <Card className="w-full p-6 py-4">
      <CardContent className="flex items-center justify-between gap-3 p-0">
        <div className="min-w-0">
          <dt className="text-muted-foreground text-sm font-medium">Review rating</dt>
          <dd className="text-foreground mt-2 text-3xl font-semibold tabular-nums">
            {average == null ? "—" : average.toFixed(1)}
          </dd>
        </div>
        <ChartContainer config={ratingRingConfig} className="aspect-square h-16 w-16 shrink-0">
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius={22}
            outerRadius={30}
            dataKey="value">
            <PolarRadiusAxis type="number" domain={[0, 100]} tick={false} tickLine={false} axisLine={false}>
              <Label content={() => null} />
            </PolarRadiusAxis>
            <RadialBar
              dataKey="value"
              background={{ fill: "var(--muted)" }}
              cornerRadius={8}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function AllFeedbackMetricCard({
  total,
  last7,
  prior7
}: {
  total: number;
  last7: number;
  prior7: number;
}) {
  const delta = percentChange(last7, prior7);
  const maxBar = Math.max(last7, prior7, 1);
  const showDelta = prior7 > 0 || last7 > 0;

  return (
    <Card className="w-full p-6 py-4">
      <CardContent className="flex items-center justify-between gap-3 p-0">
        <div className="min-w-0">
          <dt className="text-muted-foreground text-sm font-medium">All feedback</dt>
          <dd className="text-foreground mt-2 text-3xl font-semibold tabular-nums">{total}</dd>
          {showDelta && delta != null ? (
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                delta >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
              {delta >= 0 ? "+" : ""}
              {delta.toFixed(1)}% vs last week
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 text-xs">vs prior 7 days</p>
          )}
        </div>
        <div className="flex h-14 items-end gap-1.5" aria-hidden>
          <div
            className="w-3 rounded-sm bg-muted"
            style={{ height: `${Math.max(12, (prior7 / maxBar) * 100)}%` }}
          />
          <div
            className="w-3 rounded-sm bg-emerald-500"
            style={{ height: `${Math.max(12, (last7 / maxBar) * 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SatisfactionMetricCard({
  lowPct,
  midPct,
  highPct,
  hasData
}: {
  lowPct: number;
  midPct: number;
  highPct: number;
  hasData: boolean;
}) {
  return (
    <Card className="w-full p-6 py-4">
      <CardContent className="space-y-3 p-0">
        <dt className="text-muted-foreground text-sm font-medium">Avg. satisfaction</dt>
        <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
          {hasData ? (
            <>
              {lowPct > 0 ? (
                <div className="bg-red-500" style={{ width: `${lowPct}%` }} />
              ) : null}
              {midPct > 0 ? (
                <div className="bg-muted-foreground/35" style={{ width: `${midPct}%` }} />
              ) : null}
              {highPct > 0 ? (
                <div className="bg-emerald-500" style={{ width: `${highPct}%` }} />
              ) : null}
            </>
          ) : (
            <div className="bg-muted-foreground/20 w-full" />
          )}
        </div>
        <div className="text-muted-foreground grid grid-cols-3 gap-2 text-xs">
          <div className="flex flex-col items-center gap-1">
            <Frown className="size-4 text-red-500" aria-hidden />
            <span className="tabular-nums text-red-600 dark:text-red-400">
              {hasData ? `${Math.round(lowPct)}%` : "—"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Meh className="size-4 text-muted-foreground" aria-hidden />
            <span className="tabular-nums">{hasData ? `${Math.round(midPct)}%` : "—"}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Smile className="size-4 text-emerald-500" aria-hidden />
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
              {hasData ? `${Math.round(highPct)}%` : "—"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewFeedbackCard({
  rating,
  customer
}: {
  rating: TripRating;
  customer: User | undefined;
}) {
  const name =
    rating.customerDisplayName?.trim() ||
    customer?.profile.displayName?.trim() ||
    "Customer";
  const photoURL = customer?.profile.photoURL ?? undefined;
  const comment = rating.comment?.trim();

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="size-10 shrink-0">
            <AvatarImage src={photoURL} alt="" />
            <AvatarFallback>{generateAvatarFallback(name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <div className="font-medium leading-none">{name}</div>
              <div className="text-muted-foreground shrink-0 text-xs">
                {formatDateTime(rating.ratedAt)}
              </div>
            </div>
            <StarRow score={rating.score} />
            {rating.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {rating.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className={cn("border", feedbackPillStyle)}>
                    {RATING_TAG_LABELS[tag as RatingTag] ?? tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            {comment ? (
              <p className="text-muted-foreground line-clamp-2 text-sm">{comment}</p>
            ) : null}
            <Link
              href={`/dashboard/bookings/${rating.tripId}`}
              className="text-muted-foreground hover:text-foreground text-xs font-medium hover:underline">
              Booking · {shortBookingId(rating.tripId)}
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
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

    const listAverage =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
        : null;
    const average =
      typeof rosterAverage === "number" && (rosterCount ?? 0) > 0
        ? rosterAverage
        : listAverage;

    let low = 0;
    let mid = 0;
    let high = 0;
    for (const r of ratings) {
      if (r.score <= 2) low += 1;
      else if (r.score === 3) mid += 1;
      else high += 1;
    }
    const n = ratings.length;
    const lowPct = n ? (low / n) * 100 : 0;
    const midPct = n ? (mid / n) * 100 : 0;
    const highPct = n ? (high / n) * 100 : 0;

    return {
      average,
      total: ratings.length,
      last7,
      prior7,
      lowPct,
      midPct,
      highPct,
      hasData: n > 0
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
      <div className="grid gap-4 sm:grid-cols-3">
        <ReviewRatingMetricCard average={metrics.average} />
        <AllFeedbackMetricCard
          total={metrics.total}
          last7={metrics.last7}
          prior7={metrics.prior7}
        />
        <SatisfactionMetricCard
          lowPct={metrics.lowPct}
          midPct={metrics.midPct}
          highPct={metrics.highPct}
          hasData={metrics.hasData}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Recent feedback</h3>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            defaultPreset="allTime"
            className="shrink-0"
          />
        </div>

        {loading ? (
          <Card>
            <CardContent className="text-muted-foreground flex h-24 items-center justify-center text-sm">
              Loading ratings…
            </CardContent>
          </Card>
        ) : filteredRatings.length ? (
          <div className="space-y-3">
            {filteredRatings.map((rating) => (
              <ReviewFeedbackCard
                key={rating.id}
                rating={rating}
                customer={usersById[rating.customerID]}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Empty className="border-0 py-12 md:py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Star />
                  </EmptyMedia>
                  <EmptyTitle className="text-xl">{emptyMessage.title}</EmptyTitle>
                  <EmptyDescription>{emptyMessage.description}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
