"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
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
import { tripPickupReferenceDate, tripStatusTitle, TRIP_STATUSES, type Trip } from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { endOfDay, startOfDay } from "@/app/dashboard/lib/dashboard-metrics";
import { sortTripsByPickupDesc } from "@/app/dashboard/drivers/lib/driver-profile-metrics";
import { TripStatusBadge } from "@/components/trip-status-badge";
import { DateRangePicker, last7DaysRange } from "@/components/custom-date-range-picker";
import { ListFilterPopover } from "@/components/list-filter-popover";
import { ListTablePagination } from "@/components/list-table-pagination";
import { ListTableToolbar } from "@/components/list-table-toolbar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

function multiSelectFilter(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: unknown
) {
  const values = filterValue as string[] | undefined;
  if (!values?.length) return true;
  return values.includes(String(row.getValue(columnId) ?? ""));
}

function tripInDateRange(trip: Trip, range: DateRange | undefined) {
  if (!range?.from) return true;
  const ref = tripPickupReferenceDate(trip);
  const start = startOfDay(range.from);
  const end = endOfDay(range.to ?? range.from);
  return ref >= start && ref <= end;
}

export function DriverProfileTripsTab({ trips }: { trips: Trip[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "pickup", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ searchLabel: false });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>(() => last7DaysRange());

  const data = useMemo(
    () =>
      sortTripsByPickupDesc(trips)
        .filter((trip) => tripInDateRange(trip, dateRange))
        .map((trip) => ({
        ...trip,
        bookingIdLabel: shortBookingId(trip.id),
        searchLabel: [
          shortBookingId(trip.id),
          trip.customerDisplayName,
          trip.pickupAddressLine,
          trip.dropoffAddressLine
        ]
          .filter(Boolean)
          .join(" "),
        customerLabel: trip.customerDisplayName?.trim() || "—",
        pickupLabel: formatDateTime(tripPickupReferenceDate(trip)),
        pickupSort: tripPickupReferenceDate(trip).getTime()
      })),
    [trips, dateRange]
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
        id: "booking",
        header: "Booking",
        accessorKey: "bookingIdLabel",
        cell: ({ row }) => (
          <Link href={`/dashboard/bookings/${row.original.id}`} className="font-medium hover:underline">
            {row.original.bookingIdLabel}
          </Link>
        )
      },
      {
        id: "customer",
        header: "Customer",
        accessorKey: "customerLabel"
      },
      {
        id: "pickup",
        header: "Pickup",
        accessorFn: (row) => row.pickupSort,
        cell: ({ row }) => row.original.pickupLabel,
        sortingFn: "basic"
      },
      {
        id: "status",
        header: "Status",
        accessorKey: "status",
        filterFn: multiSelectFilter,
        cell: ({ row }) => (
          <TripStatusBadge status={row.original.status} />
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
          searchPlaceholder="Search bookings or customers…"
          searchColumnId="searchLabel"
          inlineControls
          className="py-2"
          filters={
            <ListFilterPopover
              label="Status"
              options={TRIP_STATUSES.map((status) => ({
                value: status,
                label: tripStatusTitle[status]
              }))}
              selected={statusFilter}
              onSelectedChange={(values) => {
                setStatusFilter(values);
                table.getColumn("status")?.setFilterValue(values.length ? values : undefined);
              }}
            />
          }
          endActions={
            <DateRangePicker
              value={dateRange}
              onChange={(range) => {
                if (range?.from) setDateRange(range);
              }}
              className="shrink-0"
            />
          }
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
              {table.getRowModel().rows.length ? (
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
                    No trips for this chauffeur.
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
