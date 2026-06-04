"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

import { tripPickupReferenceDate, tripStatusTitle, TRIP_STATUSES, type Trip } from "@/lib/models";
import { formatDateTime } from "@/lib/format";
import { sortTripsByPickupDesc } from "@/app/dashboard/drivers/lib/driver-profile-metrics";
import { TripStatusBadge } from "@/components/trip-status-badge";
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

function shortBookingId(id: string) {
  return id.length > 8 ? id.slice(0, 8).toUpperCase() : id.toUpperCase();
}

function multiSelectFilter(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: unknown
) {
  const values = filterValue as string[] | undefined;
  if (!values?.length) return true;
  return values.includes(String(row.getValue(columnId) ?? ""));
}

export function DriverProfileTripsTab({ trips }: { trips: Trip[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "pickup", desc: true }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ searchLabel: false });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const data = useMemo(
    () =>
      sortTripsByPickupDesc(trips).map((trip) => ({
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
    [trips]
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
    <Card>
      <CardContent className="space-y-4 pt-6">
        <ListTableToolbar
          table={table}
          searchPlaceholder="Search bookings or customers…"
          searchColumnId="searchLabel"
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
