"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { StarIcon } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState
} from "@tanstack/react-table";

import { shortBookingId } from "@/lib/bookings/booking-display";
import {
  RATING_TAG_LABELS,
  type RatingTag,
  type TripRating
} from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

function StarScore({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${score} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarIcon
          key={i}
          className={cn(
            "size-3.5",
            i < score
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/40"
          )}
        />
      ))}
      <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">{score}</span>
    </div>
  );
}

export function DriverProfileRatingsTab({
  ratings,
  loading
}: {
  ratings: TripRating[];
  loading?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "ratedAt", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    searchLabel: false
  });

  const data = useMemo(
    () =>
      ratings.map((rating) => ({
        ...rating,
        bookingIdLabel: shortBookingId(rating.tripId),
        customerLabel: rating.customerDisplayName?.trim() || "—",
        ratedAtLabel: formatDateTime(rating.ratedAt),
        ratedAtSort: rating.ratedAt.getTime(),
        commentLabel: rating.comment?.trim() || "—",
        searchLabel: [
          shortBookingId(rating.tripId),
          rating.customerDisplayName,
          rating.comment,
          ...rating.tags.map((t) => RATING_TAG_LABELS[t as RatingTag] ?? t)
        ]
          .filter(Boolean)
          .join(" ")
      })),
    [ratings]
  );

  const columns = useMemo<ColumnDef<(typeof data)[number]>[]>(
    () => [
      {
        id: "searchLabel",
        accessorKey: "searchLabel",
        header: () => null,
        cell: () => null,
        enableHiding: true
      },
      {
        id: "score",
        header: "Rating",
        accessorKey: "score",
        cell: ({ row }) => <StarScore score={row.original.score} />
      },
      {
        id: "tags",
        header: "Feedback",
        cell: ({ row }) =>
          row.original.tags.length ? (
            <div className="flex flex-wrap gap-1">
              {row.original.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="font-normal">
                  {RATING_TAG_LABELS[tag as RatingTag] ?? tag}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
      },
      {
        id: "comment",
        header: "Comment",
        accessorKey: "commentLabel",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[14rem]">{row.original.commentLabel}</span>
        )
      },
      {
        id: "customer",
        header: "Customer",
        accessorKey: "customerLabel"
      },
      {
        id: "ratedAt",
        header: "Date",
        accessorFn: (row) => row.ratedAtSort,
        cell: ({ row }) => row.original.ratedAtLabel,
        sortingFn: "basic"
      },
      {
        id: "booking",
        header: "Booking",
        accessorKey: "bookingIdLabel",
        cell: ({ row }) => (
          <Link
            href={`/dashboard/bookings/${row.original.tripId}`}
            className="font-medium hover:underline">
            {row.original.bookingIdLabel}
          </Link>
        )
      }
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  return (
    <Card className="min-w-0 py-0">
      <CardContent className="space-y-2 px-6 pb-4 pt-4">
        <ListTableToolbar
          table={table}
          searchPlaceholder="Search ratings, customers, or bookings…"
          searchColumnId="searchLabel"
          inlineControls
          className="py-2"
        />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    Loading ratings…
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No ratings for this chauffeur yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <ListTablePagination table={table} />
      </CardContent>
    </Card>
  );
}
